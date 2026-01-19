import pytest
import requests
from datetime import date
import time

# SERVICES (4 processes)
USER_SERVICE_URL = "http://localhost:3001"
COST_SERVICE_URL = "http://localhost:3002"
LOG_SERVICE_URL = "http://localhost:3003"
ADMIN_SERVICE_URL = "http://localhost:3004"

today = date.today()

# Local test user
user_data = {
    "id": 111111,
    "first_name": "bot",
    "last_name": "bot",
    "birthday": "1999-03-12"
}

# Submission-required imaginary user
PROF_USER = {
    "id": 123123,
    "first_name": "mosh",
    "last_name": "israeli",
    "birthday": "1990-01-01"
}

expense_data = {
    "userid": user_data["id"],
    "description": "test-food",
    "category": "food",
    "sum": 100
}

REQUIRED_CATEGORIES = {"food", "health", "housing", "sports", "education"}


def _safe_request(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception:
        return None


def _assert_error_shape(body):
    assert isinstance(body, dict)
    assert "id" in body and "message" in body


def _extract_categories(report_json):
    assert "costs" in report_json
    assert isinstance(report_json["costs"], list)

    cats = {}
    for obj in report_json["costs"]:
        assert isinstance(obj, dict)
        for k, v in obj.items():
            cats[k] = v
    return cats


def _assert_report_structure(data, year, month, userid):
    assert data.get("userid") == userid
    assert data.get("year") == year
    assert data.get("month") == month

    cats = _extract_categories(data)
    assert REQUIRED_CATEGORIES.issubset(set(cats.keys()))

    for cat in REQUIRED_CATEGORIES:
        assert isinstance(cats[cat], list)
        for item in cats[cat]:
            assert "sum" in item and "description" in item and "day" in item
            assert isinstance(item["day"], int)
            assert 1 <= item["day"] <= 31


@pytest.fixture(scope="session", autouse=True)
def setup_once():
    # Ensure local test user exists
    r1 = _safe_request(
        requests.post,
        f"{USER_SERVICE_URL}/api/add",
        json=user_data,
        timeout=5
    )
    if r1 is not None:
        assert r1.status_code in (200, 201, 400, 409)

    # Ensure professor-required user exists
    r2 = _safe_request(
        requests.post,
        f"{USER_SERVICE_URL}/api/add",
        json=PROF_USER,
        timeout=5
    )
    if r2 is not None:
        assert r2.status_code in (200, 201, 400, 409)

    yield


# -----------------------------
# Users service tests
# -----------------------------

def test_users_service_list_includes_user():
    r = requests.get(f"{USER_SERVICE_URL}/api/users", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert any(u.get("id") == user_data["id"] for u in data)


def test_users_service_get_user_details_total():
    r = requests.get(
        f"{USER_SERVICE_URL}/api/users/{user_data['id']}",
        timeout=5
    )
    assert r.status_code == 200
    body = r.json()

    assert body.get("id") == user_data["id"]
    assert "first_name" in body and "last_name" in body
    assert "total" in body

    total = body["total"]
    if isinstance(total, str):
        total = float(total)

    assert isinstance(total, (int, float))
    assert total >= 0


# -----------------------------
# Costs service tests
# -----------------------------

def test_costs_service_add_expense():
    r = requests.post(
        f"{COST_SERVICE_URL}/api/add",
        json=expense_data,
        timeout=5
    )
    assert r.status_code in (200, 201)

    body = r.json()
    assert body.get("userid") == user_data["id"]
    assert body.get("category") == expense_data["category"]
    assert body.get("description") == expense_data["description"]
    assert "sum" in body


def test_costs_service_get_report_structure():
    year = today.year
    month = today.month

    url = f"{COST_SERVICE_URL}/api/report?id={user_data['id']}&year={year}&month={month}"
    r = requests.get(url, timeout=5)
    assert r.status_code == 200

    data = r.json()
    _assert_report_structure(data, year, month, user_data["id"])


# -----------------------------
# Logs service tests
# -----------------------------

def test_logs_service_get_logs():
    r = requests.get(f"{LOG_SERVICE_URL}/api/logs", timeout=5)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_logs_not_decreasing_after_requests():
    r1 = requests.get(f"{LOG_SERVICE_URL}/api/logs", timeout=5)
    before = r1.json()
    before_count = len(before)

    requests.get(f"{USER_SERVICE_URL}/api/users", timeout=5)
    requests.get(f"{ADMIN_SERVICE_URL}/api/about", timeout=5)

    time.sleep(0.3)

    r2 = requests.get(f"{LOG_SERVICE_URL}/api/logs", timeout=5)
    after_count = len(r2.json())

    assert after_count >= before_count


# -----------------------------
# Admin / about tests
# -----------------------------

def test_admin_about():
    r = requests.get(f"{ADMIN_SERVICE_URL}/api/about/", timeout=5)
    assert r.status_code == 200
    data = r.json()

    assert isinstance(data, list)
    assert len(data) >= 1

    for obj in data:
        assert set(obj.keys()) == {"first_name", "last_name"}


# -----------------------------
# Professor-style test (EXACT FLOW)
# -----------------------------

def test_professor_style_report_before_and_after():
    user_id = 123123
    year = 2026
    month = 1

    url_report = f"{COST_SERVICE_URL}/api/report/?id={user_id}&year={year}&month={month}"
    r1 = requests.get(url_report, timeout=5)
    assert r1.status_code == 200

    url_add = f"{COST_SERVICE_URL}/api/add/"
    payload = {
        "userid": user_id,
        "description": "milk 9",
        "category": "food",
        "sum": 8
    }

    r2 = requests.post(url_add, json=payload, timeout=5)
    assert r2.status_code in (200, 201), r2.text

    r3 = requests.get(url_report, timeout=5)
    assert r3.status_code == 200


# -----------------------------
# Error / validation tests
# -----------------------------

def test_add_expense_missing_fields_returns_400():
    r = requests.post(
        f"{COST_SERVICE_URL}/api/add",
        json={"userid": user_data["id"]},
        timeout=5
    )
    assert r.status_code == 400
    _assert_error_shape(r.json())


def test_add_expense_invalid_category_returns_400():
    bad = dict(expense_data)
    bad["category"] = "other"

    r = requests.post(f"{COST_SERVICE_URL}/api/add", json=bad, timeout=5)
    assert r.status_code == 400
    _assert_error_shape(r.json())


def test_add_expense_user_not_found_returns_400():
    bad = dict(expense_data)
    bad["userid"] = 9999998

    r = requests.post(f"{COST_SERVICE_URL}/api/add", json=bad, timeout=5)
    assert r.status_code == 400
    _assert_error_shape(r.json())


def test_report_missing_params_returns_400():
    r = requests.get(f"{COST_SERVICE_URL}/api/report", timeout=5)
    assert r.status_code == 400
    _assert_error_shape(r.json())
