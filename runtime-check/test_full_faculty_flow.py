#!/usr/bin/env python3
"""
Part C: Full faculty flow through the API (using correct parameters from test_attendance_session.py)
Flow: login -> get camera/assignment -> capture -> review -> finalize
"""
import requests
import time
import json
from PIL import Image, ImageDraw
import io

BACKEND = "http://localhost:8080"

# Generate test images
def generate_dummy_image(color='blue', text='Test'):
    img = Image.new('RGB', (640, 480), color=color)
    draw = ImageDraw.Draw(img)
    draw.text((320, 240), text, fill='white')
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    return img_buffer

results = []

def log_result(part, item, status, evidence, time_ms=0):
    results.append({
        'part': part,
        'item': item,
        'status': status,
        'evidence': evidence,
        'time_ms': time_ms
    })
    print(f"[{status}] {item}: {evidence}")

print("=" * 70)
print("PART C: Full Faculty Flow Through API")
print("=" * 70)

# Step 1: Login as teacher
print("\n=== Step 1: Login as teacher ===")
start = time.time()
response = requests.post(f"{BACKEND}/auth/login", json={
    "usernameOrEmail": "teacher",
    "password": "teacher123"
})
elapsed = (time.time() - start) * 1000
log_result("C", "Login", "PASS" if response.status_code == 200 else "FAIL",
          f"Status {response.status_code}", elapsed)

if response.status_code != 200:
    print("Cannot proceed without login")
    exit(1)

token = response.json()['token']
headers = {'Authorization': f'Bearer {token}'}

# Step 2: Get cameras
print("\n=== Step 2: Get cameras ===")
start = time.time()
response = requests.get(f"{BACKEND}/api/cameras", headers=headers)
elapsed = (time.time() - start) * 1000
log_result("C", "Get cameras", "PASS" if response.status_code == 200 else "FAIL",
          f"Status {response.status_code}", elapsed)

cameras = response.json() if response.status_code == 200 else []
camera_id = cameras[0]['id'] if cameras else 3  # Use 3 as fallback (test_attendance_session.py uses this)
print(f"Using camera ID: {camera_id}")

# Step 3: Get rooms
print("\n=== Step 3: Get rooms ===")
start = time.time()
response = requests.get(f"{BACKEND}/api/rooms", headers=headers)
elapsed = (time.time() - start) * 1000
log_result("C", "Get rooms", "PASS" if response.status_code == 200 else "FAIL",
          f"Status {response.status_code}", elapsed)

rooms = response.json() if response.status_code == 200 else []
room_id = rooms[0]['id'] if rooms else 1
print(f"Using room ID: {room_id}")

# Step 4: Get assignments
print("\n=== Step 4: Get assignments ===")
start = time.time()
response = requests.get(f"{BACKEND}/teacher/assignments", headers=headers)
elapsed = (time.time() - start) * 1000
log_result("C", "Get assignments", "PASS" if response.status_code == 200 else "FAIL",
          f"Status {response.status_code}", elapsed)

assignments = response.json() if response.status_code == 200 else []
assignment_id = assignments[0]['id'] if assignments else 1
print(f"Using assignment ID: {assignment_id}")

# Step 5: Capture group photo (Session 1)
print("\n=== Step 5: Capture group photo (Session 1) ===")
start = time.time()
img_buffer = generate_dummy_image('blue', 'Group Photo 1')
files = {'image': ('capture1.jpg', img_buffer, 'image/jpeg')}
data = {
    'roomId': str(room_id),
    'cameraId': str(camera_id),
    'assignmentId': str(assignment_id)
}
response = requests.post(f"{BACKEND}/capture", files=files, data=data, headers=headers)
elapsed = (time.time() - start) * 1000
log_result("C", "Capture group photo", "PASS" if response.status_code == 200 else "FAIL",
          f"Status {response.status_code}, {response.text[:150]}", elapsed)

capture1_data = response.json() if response.status_code == 200 else {}
session1_id = capture1_data.get('sessionId') if capture1_data else None
session1_status = capture1_data.get('sessionStatus', 'N/A')
print(f"Session 1 ID: {session1_id}, Status: {session1_status}")

# Step 6: Review session 1
print("\n=== Step 6: Review session 1 ===")
if session1_id:
    start = time.time()
    response = requests.get(f"{BACKEND}/api/attendance-sessions/{session1_id}/review", headers=headers)
    elapsed = (time.time() - start) * 1000
    log_result("C", "Review session 1", "PASS" if response.status_code == 200 else "FAIL",
              f"Status {response.status_code}", elapsed)

    review1_data = response.json() if response.status_code == 200 else {}
    records = review1_data.get('records', [])
    print(f"Records count: {len(records)}")
    for rec in records[:5]:
        print(f"  Student {rec.get('studentId')} ({rec.get('rollNumber')}): {rec.get('status')}, conf={rec.get('confidenceScore')}")

# Step 7: Finalize session 1
print("\n=== Step 7: Finalize session 1 ===")
if session1_id:
    start = time.time()
    response = requests.post(f"{BACKEND}/api/attendance-sessions/{session1_id}/finalize", headers=headers)
    elapsed = (time.time() - start) * 1000
    log_result("C", "Finalize session 1", "PASS" if response.status_code == 200 else "FAIL",
              f"Status {response.status_code}, {response.text[:100]}", elapsed)

# Step 8: Capture second photo (Session 2 - different)
print("\n=== Step 8: Capture second photo (Session 2) ===")
start = time.time()
img_buffer = generate_dummy_image('green', 'Group Photo 2')
files = {'image': ('capture2.jpg', img_buffer, 'image/jpeg')}
data = {
    'roomId': str(room_id),
    'cameraId': str(camera_id),
    'assignmentId': str(assignment_id)
}
response = requests.post(f"{BACKEND}/capture", files=files, data=data, headers=headers)
elapsed = (time.time() - start) * 1000
log_result("C", "Capture second photo", "PASS" if response.status_code == 200 else "FAIL",
          f"Status {response.status_code}, {response.text[:150]}", elapsed)

capture2_data = response.json() if response.status_code == 200 else {}
session2_id = capture2_data.get('sessionId') if capture2_data else None
session2_status = capture2_data.get('sessionStatus', 'N/A')
print(f"Session 2 ID: {session2_id}, Status: {session2_status}")

# Step 9: Review session 2
print("\n=== Step 9: Review session 2 ===")
if session2_id:
    start = time.time()
    response = requests.get(f"{BACKEND}/api/attendance-sessions/{session2_id}/review", headers=headers)
    elapsed = (time.time() - start) * 1000
    log_result("C", "Review session 2", "PASS" if response.status_code == 200 else "FAIL",
              f"Status {response.status_code}", elapsed)

    review2_data = response.json() if response.status_code == 200 else {}
    records2 = review2_data.get('records', [])
    print(f"Records count: {len(records2)}")
    for rec in records2[:5]:
        print(f"  Student {rec.get('studentId')} ({rec.get('rollNumber')}): {rec.get('status')}, conf={rec.get('confidenceScore')}")

# Step 10: Finalize session 2
print("\n=== Step 10: Finalize session 2 ===")
if session2_id:
    start = time.time()
    response = requests.post(f"{BACKEND}/api/attendance-sessions/{session2_id}/finalize", headers=headers)
    elapsed = (time.time() - start) * 1000
    log_result("C", "Finalize session 2", "PASS" if response.status_code == 200 else "FAIL",
              f"Status {response.status_code}, {response.text[:100]}", elapsed)

# Step 11: Check DB for attendance records
print("\n=== Step 11: Check attendance records in DB ===")
# Query via students endpoint
start = time.time()
response = requests.get(f"{BACKEND}/students", headers=headers)
elapsed = (time.time() - start) * 1000
log_result("C", "Check roster", "PASS" if response.status_code == 200 else "FAIL",
          f"Status {response.status_code}, {len(response.json()) if response.status_code == 200 else 0} students", elapsed)

print("\n" + "=" * 70)
print("PART C SUMMARY")
print("=" * 70)
for r in results:
    print(f"{r['status']:6} | {r['item']:40} | {r['time_ms']:6.0f}ms | {r['evidence'][:60]}")
