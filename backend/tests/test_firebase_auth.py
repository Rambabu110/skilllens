import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_firebase_sync_new_user():
    mock_decoded = {
        "email": "test.firebase.officer@skilllens.in",
        "name": "Test Firebase Officer",
        "uid": "fb_uid_123456789",
        "email_verified": True,
    }
    with patch("app.routers.auth.verify_firebase_id_token", return_value=mock_decoded):
        payload = {
            "firebase_id_token": "mock_valid_token_123",
            "qualification": "M.Sc Statistics",
            "experience_years": 3.5,
        }
        response = client.post("/auth/firebase", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not found in response"
        token = data["access_token"]

        # Verify /auth/me works with this token
        me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200, f"/auth/me failed: {me_resp.text}"
        user_data = me_resp.json()
        assert user_data["email"] == "test.firebase.officer@skilllens.in"
        assert user_data["name"] == "Test Firebase Officer"
        print("PASS: Firebase sync creates user & returns valid access token")


def test_firebase_sync_existing_user():
    mock_decoded = {
        "email": "test.firebase.officer@skilllens.in",
        "name": "Test Firebase Officer",
        "uid": "fb_uid_123456789",
        "email_verified": True,
    }
    with patch("app.routers.auth.verify_firebase_id_token", return_value=mock_decoded):
        payload = {
            "firebase_id_token": "mock_valid_token_123",
        }
        response = client.post("/auth/firebase", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        assert "access_token" in response.json()
        print("PASS: Firebase sync handles existing user seamlessly")


def test_firebase_sync_unverified_email_rejected():
    mock_decoded = {
        "email": "fake.unverified@randomdomain.xyz",
        "name": "Fake Unverified",
        "uid": "fb_uid_unverified",
        "email_verified": False,
    }
    with patch("app.routers.auth.verify_firebase_id_token", return_value=mock_decoded):
        payload = {
            "firebase_id_token": "mock_unverified_token",
        }
        response = client.post("/auth/firebase", json=payload)
        assert response.status_code == 403, f"Expected 403 Forbidden for unverified email, got {response.status_code}"
        assert "not verified" in response.json()["detail"].lower()
        print("PASS: Unverified email addresses are strictly rejected with 403 Forbidden")


def test_firebase_sync_invalid_token():
    with patch("app.routers.auth.verify_firebase_id_token", side_effect=ValueError("Token expired or forged")):
        payload = {
            "firebase_id_token": "invalid_forged_token",
        }
        response = client.post("/auth/firebase", json=payload)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid or forged Firebase ID token correctly rejected with 401")


def test_demo_persona_login_rejected():
    response = client.post("/auth/login", json={"email": "nonexistent.user@skilllens.in", "password": "wrongpassword123"})
    assert response.status_code == 401, f"Expected 401 for nonexistent user, got {response.status_code}"
    wrong_pwd = client.post("/auth/login", json={"email": "aditi.demo@skilllens.in", "password": "definitelywrongpassword"})
    assert wrong_pwd.status_code == 401, f"Expected 401 for wrong password, got {wrong_pwd.status_code}"
    print("PASS: Unauthorized or invalid login credentials correctly rejected with 401")



if __name__ == "__main__":
    test_firebase_sync_new_user()
    test_firebase_sync_existing_user()
    test_firebase_sync_unverified_email_rejected()
    test_firebase_sync_invalid_token()
    test_demo_persona_login_rejected()
    print("\n>>> ALL FIREBASE BACKEND TESTS PASSED 100%! <<<")
