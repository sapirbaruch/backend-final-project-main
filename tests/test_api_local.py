import pytest
import requests
from datetime import date

# SERVICES
USER_SERVICE_URL = "http://localhost:3001"
COST_SERVICE_URL = "http://localhost:3002"
LOG_SERVICE_URL = "http://localhost:3003"
ADMIN_SERVICE_URL = "http://localhost:3004"

today = date.today()

user_data = {
    "id": 111111,
    "first_name": "bot",
    "last_name": "bot",
    "birthday": "1999-03-12"  # ISO format (safe)
}

expense_data = {
    # The server accepts either user_id or userid
    "user_id": user_data["id"],
    "year": today.year,
    "month": today.month,
    "day": today.day,
    "description": "test-food",
    "category": "food",
    "sum": 100
}


def _safe_request(fn, *args, **kwargs):
    """
    Safe HTTP wrapper: prevents tests from crashing on network/connection errors.
    Returns None on exception.
    """
    try:
        return fn(*args, **kwargs)
    except Exception:
        return None


@pytest.fixture(scope="session", autouse=True)
def setup_once():
    """
    Session setup:
    - Ensure the test user exists (create it if missing).
    We intentionally do NOT delete anything (no /remove endpoints are required).
    """

    r = _safe_request(requests.post, f"{USER_SERVICE_URL}/api/add", json=user_data, timeout=5)

    # If user already exists, some implementations return 400.
    # For our tests, that's OK — we just need the user to exist.
    if r is not None:
        assert r.status_code in (200, 201, 400)

    yield  # run tests


def test_users_service_add_user_and_list():
    # GET /api/users should include our user
    r = requests.get(f"{USER_SERVICE_URL}/api/users", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert any(u.get("id") == user_data["id"] for u in data)


def test_costs_service_add_expense():
    # POST /api/add on COST service
    r = requests.post(f"{COST_SERVICE_URL}/api/add", json=expense_data, timeout=5)
    assert r.status_code == 201

    body = r.json()
    assert body.get("userid") == user_data["id"]
    assert body.get("category") == expense_data["category"]
    assert body.get("description") == expense_data["description"]
    assert "sum" in body


def test_costs_service_get_report():
    # GET /api/report on COST service
    url = f"{COST_SERVICE_URL}/api/report?id={user_data['id']}&year={expense_data['year']}&month={expense_data['month']}"
    r = requests.get(url, timeout=5)
    assert r.status_code == 200

    data = r.json()
    assert data.get("userid") == user_data["id"]
    assert data.get("year") == expense_data["year"]
    assert data.get("month") == expense_data["month"]

    # Must include the 5 required categories
    assert "costs" in data
    assert isinstance(data["costs"], list)

    required = {"food", "health", "housing", "sports", "education"}
    present = set()
    for obj in data["costs"]:
        for k in obj.keys():
            present.add(k)

    assert required.issubset(present)


def test_users_service_get_user_details_total():
    # GET /api/users/:id should include total
    r = requests.get(f"{USER_SERVICE_URL}/api/users/{user_data['id']}", timeout=5)
    assert r.status_code == 200
    body = r.json()
    assert body.get("id") == user_data["id"]
    assert "total" in body

    # Total should be at least the last added expense (could be higher if DB already has data)
    assert body["total"] >= expense_data["sum"]


def test_logs_service_get_logs():
    # GET /api/logs should return a list
    r = requests.get(f"{LOG_SERVICE_URL}/api/logs", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


def test_admin_about():
    # GET /api/about should return list of {first_name,last_name} only
    r = requests.get(f"{ADMIN_SERVICE_URL}/api/about", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    obj = data[0]
    assert set(obj.keys()) == {"first_name", "last_name"}


# -----------------------------
# Error / validation test cases
# -----------------------------

def test_add_expense_missing_fields_returns_400():
    r = requests.post(f"{COST_SERVICE_URL}/api/add", json={"userid": user_data["id"]}, timeout=5)
    assert r.status_code == 400
    body = r.json()
    assert "id" in body and "message" in body


def test_add_expense_invalid_category_returns_400():
    bad = dict(expense_data)
    bad["category"] = "other"
    r = requests.post(f"{COST_SERVICE_URL}/api/add", json=bad, timeout=5)
    assert r.status_code == 400
    body = r.json()
    assert "id" in body and "message" in body


def test_add_expense_user_not_found_returns_400():
    bad = dict(expense_data)
    bad["user_id"] = 9999998
    r = requests.post(f"{COST_SERVICE_URL}/api/add", json=bad, timeout=5)
    assert r.status_code == 400
    body = r.json()
    assert "id" in body and "message" in body


def test_report_missing_params_returns_400():
    r = requests.get(f"{COST_SERVICE_URL}/api/report", timeout=5)
    assert r.status_code == 400
    body = r.json()
    assert "id" in body and "message" in body
