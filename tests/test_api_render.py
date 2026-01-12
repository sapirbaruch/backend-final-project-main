import pytest
import requests
from datetime import date

# SERVICES
USER_SERVICE_URL = "https://cost-manager-users-j6e2.onrender.com"
COST_SERVICE_URL = "https://cost-manager-costs-yl72.onrender.com"
LOG_SERVICE_URL = "https://cost-manager-logs-7txc.onrender.com"
ADMIN_SERVICE_URL = "https://cost-manager-admin-vcoh.onrender.com"

today = date.today()

user_data = {
    "id": 111111,
    "first_name": "bot",
    "last_name": "bot",
    "birthday": "1999-03-12"  # ISO safe format
}

expense_data = {
    # tests may send user_id; your server accepts user_id or userid
    "user_id": user_data["id"],
    "year": today.year,
    "month": today.month,
    "day": today.day,
    "description": "test-food",
    "category": "food",
    "sum": 100
}

# We will store created IDs to cleanup later
_created_cost_ids = []


def _safe_request(fn, *args, **kwargs):
    """++c Safe HTTP wrapper to avoid crashing teardown on network errors."""
    try:
        return fn(*args, **kwargs)
    except Exception:
        return None


@pytest.fixture(scope="session", autouse=True)
def setup_teardown():
    """/*
    Computed/cache behavior can persist DB state across runs.
    We ensure clean start and full cleanup at the end of the session.
    */"""

    # CLEAN START: remove user if exists (ignore errors)
    _safe_request(requests.delete, f"{USER_SERVICE_URL}/removeuser", json={"id": user_data["id"]}, timeout=5)

    # SETUP: create the user
    r = requests.post(f"{USER_SERVICE_URL}/api/add", json=user_data, timeout=5)
    assert r.status_code in (200, 201)

    yield  # run tests

    # TEARDOWN: remove report for this month (ignore errors)
    _safe_request(
        requests.delete,
        f"{COST_SERVICE_URL}/removereport",
        json={"user_id": user_data["id"], "year": expense_data["year"], "month": expense_data["month"]},
        timeout=5
    )

    # TEARDOWN: remove created costs by _id
    for cid in _created_cost_ids:
        _safe_request(requests.delete, f"{COST_SERVICE_URL}/removecost", json={"_id": cid}, timeout=5)

    # TEARDOWN: remove user
    _safe_request(requests.delete, f"{USER_SERVICE_URL}/removeuser", json={"id": user_data["id"]}, timeout=5)


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
    print("1234")
    print(body)
    # store _id for cleanup
    assert "_id" in body
    _created_cost_ids.append(body["_id"])

    assert body.get("userid") == user_data["id"]
    assert body.get("category") == expense_data["category"]
    assert body.get("description") == expense_data["description"]


def test_costs_service_get_report():
    # GET /api/report on COST service
    url = f"{COST_SERVICE_URL}/api/report?id={user_data['id']}&year={expense_data['year']}&month={expense_data['month']}"
    r = requests.get(url, timeout=5)
    assert r.status_code == 200

    data = r.json()
    assert data.get("userid") == user_data["id"]
    assert data.get("year") == expense_data["year"]
    assert data.get("month") == expense_data["month"]

    # Should have the 5 required categories only
    assert "costs" in data
    assert isinstance(data["costs"], list)

    # Verify required categories exist
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
    # total should be >= sum we added (exact depends on previous DB if not cleaned)
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
    bad["user_id"] = 999999
    r = requests.post(f"{COST_SERVICE_URL}/api/add", json=bad, timeout=5)
    assert r.status_code == 400
    body = r.json()
    assert "id" in body and "message" in body


def test_report_missing_params_returns_400():
    r = requests.get(f"{COST_SERVICE_URL}/api/report", timeout=5)
    assert r.status_code == 400
    body = r.json()
    assert "id" in body and "message" in body