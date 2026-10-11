import requests
import json

base_url = "http://127.0.0.1:8080"
login_payload = {"usernameOrEmail": "teacher", "password": "teacher123"}

try:
    r = requests.post(f"{base_url}/auth/login", json=login_payload)
    print("Login status:", r.status_code)
    token = r.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n--- Testing /api/timetable/current-period ---")
    r1 = requests.get(f"{base_url}/api/timetable/current-period", headers=headers)
    print("Status:", r1.status_code)
    print("Body:", r1.text)

    print("\n--- Testing /api/analytics/all ---")
    r2 = requests.get(f"{base_url}/api/analytics/all", headers=headers)
    print("Status:", r2.status_code)
    print("Body:", r2.text)

    print("\n--- Testing /capture ---")
    r3 = requests.post(f"{base_url}/capture", headers=headers, json={})
    print("POST /capture Status:", r3.status_code)
    print("Body:", r3.text)
    
    r3_get = requests.get(f"{base_url}/capture", headers=headers)
    print("GET /capture Status:", r3_get.status_code)
    print("Body:", r3_get.text)

except Exception as e:
    print("Exception:", e)
