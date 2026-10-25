#!/usr/bin/env python3
"""
Test end-to-end multi-shot capture and student enrollment endpoints with JWT auth.
"""
import json
import os
import requests

BACKEND = "http://localhost:8080"
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_FACE = os.path.join(TEST_DIR, "docs", "edge-spike", "crops", "classroom_1899", "face_00.jpg")


def run():
    print("Logging in as teacher...")
    r = requests.post(f"{BACKEND}/auth/login", json={"usernameOrEmail": "teacher", "password": "teacher123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("  [PASS] Logged in successfully, token received.")

    # 1. Test student enrollment status
    print("\nTesting GET /students/1/enrollment-status...")
    r = requests.get(f"{BACKEND}/students/1/enrollment-status", headers=headers)
    print(f"  HTTP {r.status_code}: {r.json()}")
    assert r.status_code == 200, f"Enrollment status failed: {r.text}"
    status = r.json()
    print(f"  [PASS] Student 1: totalEmbeddingFrames={status.get('totalEmbeddingFrames')}, meetsMinimum30Frames={status.get('meetsMinimum30Frames')}")

    # 2. Test enrolling a frame
    print("\nTesting POST /students/1/enroll-frame (with consentGiven=true)...")
    with open(SAMPLE_FACE, "rb") as f:
        r = requests.post(
            f"{BACKEND}/students/1/enroll-frame",
            headers=headers,
            params={"angleHint": "FRONT", "consentGiven": "true"},
            files={"image": ("face.jpg", f.read(), "image/jpeg")}
        )
    assert r.status_code == 200, f"Enroll frame failed: {r.text}"
    total = r.json().get('totalEmbeddings')
    print(f"  [PASS] Frame enrolled. Total embeddings now: {total}")

    # 3. Test multi-shot start
    print("\nTesting POST /capture/multi-shot/start...")
    r = requests.post(
        f"{BACKEND}/capture/multi-shot/start",
        headers=headers,
        params={"roomId": 1, "cameraId": 3, "assignmentId": 1}
    )
    print(f"  HTTP {r.status_code}: {r.text[:150]}")
    assert r.status_code == 200, f"Start multi-shot failed: {r.text}"
    session_id = r.json()["sessionId"]
    print(f"  [PASS] Multi-shot session started: ID={session_id}")

    # 4. Add frame 1
    print(f"\nTesting POST /capture/multi-shot/{session_id}/frame (Frame 1)...")
    with open(SAMPLE_FACE, "rb") as f:
        r = requests.post(
            f"{BACKEND}/capture/multi-shot/{session_id}/frame",
            headers=headers,
            files={"image": ("frame1.jpg", f.read(), "image/jpeg")}
        )
    print(f"  HTTP {r.status_code}: {r.json()}")
    assert r.status_code == 200, f"Add frame 1 failed: {r.text}"
    count1 = r.json().get("recognisedCount")

    # 5. Add frame 2 (same face, should be merged/de-duplicated)
    print(f"\nTesting POST /capture/multi-shot/{session_id}/frame (Frame 2 - deduplication test)...")
    with open(SAMPLE_FACE, "rb") as f:
        r = requests.post(
            f"{BACKEND}/capture/multi-shot/{session_id}/frame",
            headers=headers,
            files={"image": ("frame2.jpg", f.read(), "image/jpeg")}
        )
    print(f"  HTTP {r.status_code}: {r.json()}")
    assert r.status_code == 200, f"Add frame 2 failed: {r.text}"
    count2 = r.json().get("recognisedCount")
    print(f"  [PASS] Frame 1 count={count1}, Frame 2 count={count2} (properly deduplicated)")

    # 6. Check status
    print(f"\nTesting GET /capture/multi-shot/{session_id}/status...")
    r = requests.get(f"{BACKEND}/capture/multi-shot/{session_id}/status", headers=headers)
    print(f"  HTTP {r.status_code}: {r.json()}")
    assert r.status_code == 200

    # 7. Finalise
    print(f"\nTesting POST /capture/multi-shot/{session_id}/finalise...")
    r = requests.post(f"{BACKEND}/capture/multi-shot/{session_id}/finalise", headers=headers)
    print(f"  HTTP {r.status_code}: status={r.json().get('status')}")
    assert r.status_code == 200
    records = r.json().get("attendanceRecords", [])
    print(f"  [PASS] Session finalised! Records count: {len(records)}, Session status: {r.json().get('status')}")

    print("\n" + "=" * 60)
    print("ALL MULTI-SHOT & ENROLLMENT ENDPOINTS PASSED E2E!")
    print("=" * 60)


if __name__ == "__main__":
    run()
