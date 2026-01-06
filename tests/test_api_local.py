import pytest
import requests
import os

# DEFINE THE 4 SEPARATE SERVICES
USER_SERVICE_URL = "http://localhost:3001"
COST_SERVICE_URL = "http://localhost:3002"
ADMIN_SERVICE_URL = "http://localhost:3004"

expense_data = { "user_id": 111111, "year": 2023, "month": 5, "day": 12, "description": "test-food", "category": "food", "sum": 100 }
user_data = { "id": 111111, "first_name": "bot", "last_name": "bot", "birthday": "March, 12th, 1999" }

@pytest.fixture(scope="session", autouse=True)
def setup_teardown():
    # 1. CLEAN START: Try to delete the user first (ignores error if user doesn't exist)
    requests.delete(f"{USER_SERVICE_URL}/removeuser", json={"id": user_data["id"]})
    
    # 2. SETUP: Create the user
    response = requests.post(f"{USER_SERVICE_URL}/api/add", json=user_data)
    assert response.status_code == 201
    
    yield  # Run tests
    
    # 3. TEARDOWN: Cleanup everything
    requests.delete(f"{COST_SERVICE_URL}/removereport", json={"user_id": user_data["id"], "year": expense_data["year"], "month": expense_data["month"]})
    requests.delete(f"{USER_SERVICE_URL}/removeuser", json={"id": user_data["id"]})

def test_add_expense():
    # Test: Add cost on COST service
    response = requests.post(f"{COST_SERVICE_URL}/api/add", json=expense_data)
    assert response.status_code == 201

def test_get_report():
    # Test: Get report on COST service
    url = f"{COST_SERVICE_URL}/api/report?user_id={user_data['id']}&year={expense_data['year']}&month={expense_data['month']}"
    response = requests.get(url)
    assert response.status_code == 200
    # Check for either flat structure or 'costs' array depending on implementation
    data = response.json()
    assert "food" in data or "costs" in data

def test_get_user_details():
    # Test: Get details on USER service
    response = requests.get(f"{USER_SERVICE_URL}/api/users/{user_data['id']}")
    assert response.status_code == 200
    assert "total" in response.json()

def test_admin_about():
    # Test: Get team on ADMIN service
    response = requests.get(f"{ADMIN_SERVICE_URL}/api/about")
    assert response.status_code == 200