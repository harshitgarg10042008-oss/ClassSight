#!/usr/bin/env python3
"""Debug the full capture+recognition flow with the backend."""
import io
import json
import requests
from PIL import Image

BACKEND = "http://localhost:8080"
FACE_SERVICE = "http://localhost:8000"
LFW_ROOT = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"

# Login
res = requests.post(f"{BACKEND}/auth/login", json={"usernameOrEmail": "teacher", "password": "teacher123"})
token = res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}
print("Authenticated.")

# Get review data for the latest session
# Find the session
res = requests.get(f"{BACKEND}/api/attendance-sessions", headers=headers)
if res.status_code != 200:
    print(f"Failed to list sessions: {res.text}")
    exit(1)
sessions = res.json()
if not sessions:
    print("No sessions found")
    exit(0)

# Find the RTC_SEC_STEP2 session
for sess in reversed(sessions):
    sess_id = sess.get("id")
    res2 = requests.get(f"{BACKEND}/api/attendance-sessions/{sess_id}/review", headers=headers)
    if res2.status_code == 200:
        data = res2.json()
        section = data.get("classSectionName", "")
        if "RTC_SEC_STEP2" in section or "RTC" in section:
            print(f"\nSession {sess_id} ({section}):")
            print(f"  Status: {data.get('sessionStatus')}")
            all_rec = data.get("allRecords", [])
            unmatched = data.get("unmatchedFaces", [])
            print(f"  Records ({len(all_rec)}):")
            for r in all_rec:
                print(f"    {r.get('rollNumber')}: status={r.get('status')}, state={r.get('recognitionState')}, d={r.get('manhattanDistance')}, tier={r.get('tier')}, conf={r.get('confidenceScore')}")
            print(f"  Unmatched faces: {len(unmatched)}")
            for u in unmatched:
                print(f"    {u}")
            break
else:
    print("No RTC sessions found")
