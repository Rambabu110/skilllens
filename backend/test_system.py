import requests

BASE = "http://127.0.0.1:8000"

def test():
    # 1. Root
    r = requests.get(f"{BASE}/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    print("1. Root: OK")

    # 2. Positions
    r = requests.get(f"{BASE}/positions")
    assert r.status_code == 200, f"Positions failed: {r.text}"
    positions = r.json()
    print(f"2. Positions: {len(positions)} positions found")

    # 3. Login
    r = requests.post(f"{BASE}/auth/login", json={"email": "aditi.demo@skilllens.in", "password": "demo1234"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    print("3. Login: OK (Token received)")

    headers = {"Authorization": f"Bearer {token}"}

    # 4. Competency Profile
    r = requests.get(f"{BASE}/competency/profile", headers=headers)
    assert r.status_code == 200, f"Profile failed: {r.text}"
    profile = r.json()
    print(f"4. Competency Profile: {len(profile)} competencies loaded")

    # 5. SHAP Explainability
    r = requests.get(f"{BASE}/competency/explain", headers=headers)
    assert r.status_code == 200, f"SHAP failed: {r.text}"
    shap_data = r.json()
    print(f"5. SHAP Explain: OK (explainable={shap_data.get('explainable')}, factors={len(shap_data.get('top_factors', []))})")

    # 6. Gaps
    r = requests.get(f"{BASE}/gaps", headers=headers)
    assert r.status_code == 200, f"Gaps failed: {r.text}"
    gaps = r.json()
    print(f"6. Gaps: {len(gaps)} gaps detected")

    # 7. Recommendations
    r = requests.get(f"{BASE}/recommendations", headers=headers)
    assert r.status_code == 200, f"Recommendations failed: {r.text}"
    recs = r.json()
    print(f"7. Recommendations: {len(recs)} modules recommended")

    # 8. Admin login & cohort
    r = requests.post(f"{BASE}/auth/login", json={"email": "admin.demo@skilllens.in", "password": "admin1234"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    r = requests.get(f"{BASE}/admin/cohort-overview", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200, f"Cohort failed: {r.text}"
    cohort = r.json()
    print(f"8. Admin Cohort Overview: {len(cohort.get('positions', []))} positions, {len(cohort.get('learners', []))} learners")

    # 9. Frontend Check
    rf = requests.get("http://127.0.0.1:5173/")
    assert rf.status_code == 200, f"Frontend check failed: {rf.status_code}"
    print("9. Frontend Dev Server: OK (HTTP 200)")

    print("\n>>> ALL 9/9 SYSTEM & API VERIFICATIONS PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    test()
