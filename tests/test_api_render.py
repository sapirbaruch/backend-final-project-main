import pytest
import requests
import time
from datetime import date

# SERVICES (Render deployment): base URLs for the 4 microservices.
USER_SERVICE_URL = "https://cost-manager-users-j6e2.onrender.com"
COST_SERVICE_URL = "https://cost-manager-costs-yl72.onrender.com"
LOG_SERVICE_URL = "https://cost-manager-logs-7txc.onrender.com"
ADMIN_SERVICE_URL = "https://cost-manager-admin-vcoh.onrender.com"

# Use today's date to validate current-month report retrieval on Render.
today = date.today()

# Safe test user on Render (no delete operations in this suite).
user_data = {
    "id": 111111,
    "first_name": "bot",
    "last_name": "bot",
    "birthday": "1999-03-12"
}

# Minimal required cost fields according to the project requirements.
expense_minimal = {
    "userid": user_data["id"],
    "description": "test-food",
    "category": "food",
    "sum": 100
}

# Categories required to exist in report output even when empty.
REQUIRED_CATEGORIES = {"food", "health", "housing", "sports", "education"}


# Helper: execute a request function safely (return None on any exception).
def _safe_request(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception:
        return None


# Helper: Render-safe request wrapper with timeouts and retries on network failures only.
def _request_with_retry(method, url, attempts=4, timeout=12, sleep_seconds=2, **kwargs):
    """
    Render-safe request:
    - Always uses a timeout (never hangs forever)
    - Retries only on network/timeouts
    - If server responds (even 4xx/5xx) we return it immediately
    """
    last_exc = None
    for i in range(attempts):
        try:
            resp = requests.request(method, url, timeout=timeout, **kwargs)
            return resp
        except (
            requests.exceptions.Timeout,
            requests.exceptions.ConnectionError,
            requests.exceptions.ChunkedEncodingError,
        ) as e:
            last_exc = e
            if i < attempts - 1:
                time.sleep(sleep_seconds)
            continue
    raise last_exc


# Helper: validate the standard error JSON shape {id, message}.
def _assert_error_shape(body):
    assert isinstance(body, dict)
    assert "id" in body and "message" in body


# Helper: convert report_json["costs"] (list of dicts) into a category->items mapping.
def _extract_categories(report_json):
    """
    report_json["costs"] is a list like:
      {"food": [ ... ]},
      {"education": [ ... ]},
      {"health": []},
      {"housing": []},
      {"sports": []}
    Returns dict: {"food": [...], ...}
    """
    assert "costs" in report_json
    assert isinstance(report_json["costs"], list)

    cats = {}
    for obj in report_json["costs"]:
        assert isinstance(obj, dict)
        for k, v in obj.items():
            cats[k] = v
    return cats


# Helper: validate report structure and enforce that all required categories exist.
def _assert_report_structure(data, year, month, userid):
    assert data.get("userid") == userid
    assert data.get("year") == year
    assert data.get("month") == month

    cats = _extract_categories(data)

    # Must include all 5 categories even if empty.
    assert REQUIRED_CATEGORIES.issubset(set(cats.keys()))

    for cat in REQUIRED_CATEGORIES:
        assert isinstance(cats[cat], list)

        # If category has items, each item must include sum/description/day.
        for item in cats[cat]:
            assert isinstance(item, dict)
            assert "sum" in item and "description" in item and "day" in item
            assert isinstance(item["day"], int)
            assert 1 <= item["day"] <= 31


# Helper: warm up services to reduce Render cold-start timeouts (any status is acceptable).
def _warm_up_services():
    """
    Helps avoid Render cold-start timeouts by touching each service once.
    Any status code is fine here; we just want the dynos awake.
    """
    _request_with_retry("GET", f"{USER_SERVICE_URL}/api/users", attempts=2, timeout=12)
    _request_with_retry("GET", f"{COST_SERVICE_URL}/api/report?id=123123&year=2026&month=1", attempts=2, timeout=12)
    _request_with_retry("GET", f"{LOG_SERVICE_URL}/api/logs", attempts=2, timeout=12)
    _request_with_retry("GET", f"{ADMIN_SERVICE_URL}/api/about", attempts=2, timeout=12)


# Session fixture: warm up dynos and ensure required users exist for the full test session.
@pytest.fixture(scope="session", autouse=True)
def setup_once():
    """
    Session setup:
    - Warm up services to reduce cold-start issues
    - Ensure the test user exists (create it if missing)
    - Ensure imaginary submission user 123123 exists (needed for professor-style tests)
    """
    _warm_up_services()

    r = _safe_request(requests.post, f"{USER_SERVICE_URL}/api/add", json=user_data, timeout=12)
    if r is not None:
        assert r.status_code in (200, 201, 400, 409)

    # Professor-required user for the fixed flow tests (id=123123).
    prof_user = {
        "id": 123123,
        "first_name": "mosh",
        "last_name": "israeli",
        "birthday": "1990-01-01",
    }
    r2 = _safe_request(requests.post, f"{USER_SERVICE_URL}/api/add", json=prof_user, timeout=12)
    if r2 is not None:
        assert r2.status_code in (200, 201, 400, 409)

    yield  # run tests


# -----------------------------
# Users service tests
# -----------------------------

def test_users_service_list_includes_user():
    r = _request_with_retry("GET", f"{USER_SERVICE_URL}/api/users")
    assert r.status_code == 200, f"status={r.status_code} body={r.text}"
    data = r.json()
    assert isinstance(data, list)
    assert any(u.get("id") == user_data["id"] for u in data)


def test_users_service_get_user_details_total():
    r = _request_with_retry("GET", f"{USER_SERVICE_URL}/api/users/{user_data['id']}")
    assert r.status_code == 200, f"status={r.status_code} body={r.text}"
    body = r.json()

    # Validate that response includes the logical user id and computed "total".
    assert body.get("id") == user_data["id"]
    assert "total" in body

    total = body["total"]
    # Accept number OR numeric string like "100.00".
    if isinstance(total, str):
        total = float(total)

    assert isinstance(total, (int, float))
    assert total >= 0


# -----------------------------
# Costs service tests
# -----------------------------

def test_costs_service_add_expense_minimal_fields():
    r = _request_with_retry("POST", f"{COST_SERVICE_URL}/api/add", json=expense_minimal)
    assert r.status_code in (200, 201), f"status={r.status_code} body={r.text}"

    # Validate returned cost object fields match the payload.
    body = r.json()
    assert body.get("userid") == user_data["id"]
    assert body.get("category") == expense_minimal["category"]
    assert body.get("description") == expense_minimal["description"]
    assert "sum" in body


def test_costs_service_get_report_structure():
    year = today.year
    month = today.month

    # Try both variants: /api/report and /api/report/ (some deployments differ).
    url1 = f"{COST_SERVICE_URL}/api/report?id={user_data['id']}&year={year}&month={month}"
    url2 = f"{COST_SERVICE_URL}/api/report/?id={user_data['id']}&year={year}&month={month}"

    r = _request_with_retry("GET", url1)
    if r.status_code != 200:
        r = _request_with_retry("GET", url2)

    assert r.status_code == 200, f"status={r.status_code} body={r.text}"

    data = r.json()
    _assert_report_structure(data, year, month, user_data["id"])


# -----------------------------
# Logs service tests
# -----------------------------

def test_logs_service_get_logs_returns_list():
    r = _request_with_retry("GET", f"{LOG_SERVICE_URL}/api/logs")
    assert r.status_code == 200, f"status={r.status_code} body={r.text}"
    data = r.json()
    assert isinstance(data, list)


# -----------------------------
# Admin/about tests
# -----------------------------

def test_admin_about_only_first_last_name():
    # Professor sample uses /api/about/ but some routers accept /api/about.
    url1 = f"{ADMIN_SERVICE_URL}/api/about/"
    url2 = f"{ADMIN_SERVICE_URL}/api/about"

    r = _request_with_retry("GET", url1)
    if r.status_code != 200:
        r = _request_with_retry("GET", url2)

    assert r.status_code == 200, f"status={r.status_code} body={r.text}"

    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    # Each team member must include ONLY first_name and last_name.
    for obj in data:
        assert isinstance(obj, dict)
        assert set(obj.keys()) == {"first_name", "last_name"}


# -----------------------------
# Error / validation test cases
# -----------------------------

def test_add_expense_missing_fields_returns_400():
    r = _request_with_retry("POST", f"{COST_SERVICE_URL}/api/add", json={"userid": user_data["id"]})
    assert r.status_code == 400, f"status={r.status_code} body={r.text}"
    _assert_error_shape(r.json())


def test_add_expense_invalid_category_returns_400():
    bad = dict(expense_minimal)
    bad["category"] = "other"
    r = _request_with_retry("POST", f"{COST_SERVICE_URL}/api/add", json=bad)
    assert r.status_code == 400, f"status={r.status_code} body={r.text}"
    _assert_error_shape(r.json())


def test_add_expense_user_not_found_returns_400():
    bad = dict(expense_minimal)
    bad["userid"] = 9999998
    r = _request_with_retry("POST", f"{COST_SERVICE_URL}/api/add", json=bad)
    assert r.status_code == 400, f"status={r.status_code} body={r.text}"
    _assert_error_shape(r.json())


def test_report_missing_params_returns_400():
    r = _request_with_retry("GET", f"{COST_SERVICE_URL}/api/report")
    assert r.status_code == 400, f"status={r.status_code} body={r.text}"
    _assert_error_shape(r.json())


# -----------------------------
# Professor-style tests (EXACT FLOW)
# -----------------------------

def test_professor_style_flow_about_report_add_report():
    """
    Mimics the professor's sample script flow on Render:
    1) GET /api/about/
    2) GET /api/report/?id=123123&year=2026&month=1
    3) POST /api/add/ with userid=123123
    4) GET report again
    """
    _warm_up_services()

    # 1) about: accept both /api/about/ and /api/about.
    about_url = f"{ADMIN_SERVICE_URL}/api/about/"
    r_about = _request_with_retry("GET", about_url, attempts=3, timeout=12)
    if r_about.status_code != 200:
        r_about = _request_with_retry("GET", f"{ADMIN_SERVICE_URL}/api/about", attempts=3, timeout=12)

    assert r_about.status_code == 200, f"about status={r_about.status_code} body={r_about.text}"

    about_data = r_about.json()
    assert isinstance(about_data, list)
    assert len(about_data) >= 1
    for obj in about_data:
        assert set(obj.keys()) == {"first_name", "last_name"}

    # 2) report (before): fixed user/year/month used by professor-style tests.
    user_id = 123123
    year = 2026
    month = 1
    report_url = f"{COST_SERVICE_URL}/api/report/?id={user_id}&year={year}&month={month}"

    r1 = _request_with_retry("GET", report_url, attempts=3, timeout=12)
    assert r1.status_code == 200, f"report(before) status={r1.status_code} body={r1.text}"

    data1 = r1.json()
    assert data1.get("userid") == user_id
    assert data1.get("year") == year
    assert data1.get("month") == month

    # 3) add cost: add a simple cost item for the professor user.
    add_url = f"{COST_SERVICE_URL}/api/add/"
    payload = {"userid": user_id, "description": "milk 9", "category": "food", "sum": 8}

    r2 = _request_with_retry("POST", add_url, json=payload, attempts=3, timeout=12)
    assert r2.status_code in (200, 201), f"add cost status={r2.status_code} body={r2.text}"

    # 4) report (after): must still return the correct shape.
    r3 = _request_with_retry("GET", report_url, attempts=3, timeout=12)
    assert r3.status_code == 200, f"report(after) status={r3.status_code} body={r3.text}"

    data3 = r3.json()
    assert data3.get("userid") == user_id
    assert data3.get("year") == year
    assert data3.get("month") == month
    assert "costs" in data3
