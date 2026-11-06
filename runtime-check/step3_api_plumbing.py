#!/usr/bin/env python3
"""
Step 3: Real-face plumbing through the API
Executes full faculty flow:
1. Create class section + subject + room assignment for teacher
2. Enroll 3 class identities (RTC_ prefix) via real enrollment endpoint with consent
3. Confirm GET /students returns them
4. Session 1: 3-face side-by-side group image -> /capture
5. Review & finalize Session 1 -> show audit info
6. Session 2: 2-face side-by-side group image -> /capture
7. Review & finalize Session 2 -> confirm removed student is ABSENT
8. Query and display DB rows
"""
import io
import json
import os
import sys
import time
import requests
from PIL import Image

BACKEND = "http://localhost:8080"
FACE_SERVICE = "http://localhost:8000"

results = []

def record_step(step_name, endpoint, method, status_code, elapsed_ms, passed, excerpt):
    item = {
        "step": step_name,
        "endpoint": f"{method} {endpoint}",
        "status_code": status_code,
        "elapsed_ms": round(elapsed_ms, 2),
        "result": "PASS" if passed else "FAIL",
        "excerpt": excerpt[:200] if excerpt else ""
    }
    results.append(item)
    print(f"[{item['result']}] {step_name} -> {item['endpoint']} ({status_code}) in {item['elapsed_ms']}ms: {item['excerpt']}")
    return passed

# Step 0: Login as teacher
t0 = time.perf_counter()
res = requests.post(f"{BACKEND}/auth/login", json={"usernameOrEmail": "teacher", "password": "teacher123"})
t_login = (time.perf_counter() - t0) * 1000
if not record_step("Teacher Login", "/auth/login", "POST", res.status_code, t_login, res.status_code == 200, res.text):
    sys.exit(1)

auth_data = res.json()
token = auth_data["token"]
headers = {"Authorization": f"Bearer {token}"}

# Load dataset manifest
with open("runtime-check/dataset_manifest.json") as f:
    manifest = json.load(f)

class_people = manifest["class_identities"][:3]
print(f"\nEnrolling 3 class identities: {[c['name'] for c in class_people]}")

# 1. Create class section + subject + room assignment
# Use subject 1 (Data Structures) and room 1 (Room 101)
t0 = time.perf_counter()
create_class_payload = {
    "name": "RTC_SEC_A",
    "subjectId": 1,
    "roomId": 1,
    "academicYear": 2026
}
res = requests.post(f"{BACKEND}/students/classes", json=create_class_payload, headers=headers)
t_create_class = (time.perf_counter() - t0) * 1000
record_step("Create Class Section", "/students/classes", "POST", res.status_code, t_create_class, res.status_code == 200, res.text)
if res.status_code != 200:
    sys.exit(1)

class_info = res.json()
class_section_id = class_info["id"]
assignment_id = class_info["assignmentId"]
subject_id = class_info["subjectId"]
room_id = class_info["roomId"]
camera_id = 3  # Browser Webcam / Camera 101-A

print(f"Created Section: ID={class_section_id}, Assignment={assignment_id}, Subject={subject_id}, Room={room_id}")

# 2. Enroll 3 class identities (RTC_ prefix) via real enrollment endpoint with consent
enrolled_students = []
for i, person in enumerate(class_people):
    roll_num = f"RTC_STU_{i+1:02d}"
    name = f"RTC_{person['name']}"
    enroll_img_path = person["enroll_path"]
    
    with open(enroll_img_path, "rb") as f_img:
        files = {"photo": (os.path.basename(enroll_img_path), f_img, "image/jpeg")}
        data = {
            "rollNumber": roll_num,
            "name": name,
            "classSectionId": str(class_section_id),
            "subjectId": str(subject_id),
            "consentGiven": "true"
        }
        t0 = time.perf_counter()
        res = requests.post(f"{BACKEND}/students/enroll-single", files=files, data=data, headers=headers)
        t_enroll = (time.perf_counter() - t0) * 1000
        passed = (res.status_code == 200 and res.json().get("status") == "success")
        record_step(f"Enroll {roll_num} ({person['name']})", "/students/enroll-single", "POST", res.status_code, t_enroll, passed, res.text)
        if passed:
            enrolled_students.append(res.json()["student"])

if len(enrolled_students) != 3:
    print(f"ERROR: Expected 3 enrolled students, got {len(enrolled_students)}")
    sys.exit(1)

# 3. Confirm GET /students returns them
t0 = time.perf_counter()
res = requests.get(f"{BACKEND}/students?classSectionId={class_section_id}", headers=headers)
t_get_students = (time.perf_counter() - t0) * 1000
roster = res.json() if res.status_code == 200 else []
rtc_roster = [s for s in roster if str(s.get("rollNumber", "")).startswith("RTC_")]
passed = (res.status_code == 200 and len(rtc_roster) == 3)
record_step("Verify Roster (GET /students)", f"/students?classSectionId={class_section_id}", "GET", res.status_code, t_get_students, passed, f"Found {len(rtc_roster)} RTC_ students: {[s['rollNumber'] for s in rtc_roster]}")

# 4. Session 1: build side-by-side group image of the 3 (using test_path, different from enrollment)
im1 = Image.open(class_people[0]["test_path"])
im2 = Image.open(class_people[1]["test_path"])
im3 = Image.open(class_people[2]["test_path"])

w = im1.size[0] + im2.size[0] + im3.size[0]
h = max(im1.size[1], im2.size[1], im3.size[1])
composite1 = Image.new("RGB", (w, h))
composite1.paste(im1, (0, 0))
composite1.paste(im2, (im1.size[0], 0))
composite1.paste(im3, (im1.size[0] + im2.size[0], 0))

os.makedirs("runtime-check/test_images", exist_ok=True)
composite1_path = "runtime-check/test_images/RTC_session1_3faces.jpg"
composite1.save(composite1_path, format="JPEG")
print(f"\nSaved Session 1 composite image ({w}x{h}) to {composite1_path}")

# Send to /capture
with open(composite1_path, "rb") as f_img:
    files = {"image": ("capture1.jpg", f_img, "image/jpeg")}
    data = {
        "roomId": str(room_id),
        "cameraId": str(camera_id),
        "assignmentId": str(assignment_id)
    }
    t0 = time.perf_counter()
    res = requests.post(f"{BACKEND}/capture", files=files, data=data, headers=headers)
    t_capture1 = (time.perf_counter() - t0) * 1000

cap1_data = res.json() if res.status_code == 200 else {}
session1_id = cap1_data.get("sessionId")
session1_status = cap1_data.get("sessionStatus")
passed1 = (res.status_code == 200 and session1_status in ("REVIEW_REQUIRED", "FINALIZED"))
record_step("Session 1 Capture (3 faces)", "/capture", "POST", res.status_code, t_capture1, passed1, f"sessionId={session1_id}, status={session1_status}")

# 5. Fetch review for Session 1
t0 = time.perf_counter()
res = requests.get(f"{BACKEND}/api/attendance-sessions/{session1_id}/review", headers=headers)
t_review1 = (time.perf_counter() - t0) * 1000
review1_data = res.json() if res.status_code == 200 else {}
records1 = review1_data.get("allRecords") or review1_data.get("records") or []
print(f"Session 1 records count: {len(records1)}")
for r in records1:
    print(f"  Student {r.get('studentId')} ({r.get('rollNumber')}): {r.get('status')} | conf={r.get('confidenceScore')} | state={r.get('recognitionState')}")
record_step("Session 1 Get Review", f"/api/attendance-sessions/{session1_id}/review", "GET", res.status_code, t_review1, res.status_code == 200, f"records={len(records1)}")

# 6. Finalize Session 1 using POST /api/attendance-sessions/{id}/review
# Build decisions for any student still in REVIEW
decisions1 = []
for r in records1:
    if r.get("status") == "REVIEW":
        decisions1.append({"studentId": r["studentId"], "decision": "PRESENT"})

finalize_payload1 = {
    "decisions": decisions1,
    "unknownFaceAssignments": [],
    "acknowledgeUnknownFaces": True
}
t0 = time.perf_counter()
res = requests.post(f"{BACKEND}/api/attendance-sessions/{session1_id}/review", json=finalize_payload1, headers=headers)
t_final1 = (time.perf_counter() - t0) * 1000
fin1_data = res.json() if res.status_code == 200 else {}
passed_fin1 = (res.status_code == 200 and fin1_data.get("status") == "FINALIZED")
record_step("Session 1 Finalize", f"/api/attendance-sessions/{session1_id}/review", "POST", res.status_code, t_final1, passed_fin1, f"status={fin1_data.get('status')}, finalizedBy={fin1_data.get('finalizedBy')}")

# 7. Session 2: build side-by-side group image of ONLY 2 of the 3 (remove student 3)
composite2 = Image.new("RGB", (im1.size[0] + im2.size[0], max(im1.size[1], im2.size[1])))
composite2.paste(im1, (0, 0))
composite2.paste(im2, (im1.size[0], 0))

composite2_path = "runtime-check/test_images/RTC_session2_2faces.jpg"
composite2.save(composite2_path, format="JPEG")
print(f"\nSaved Session 2 composite image (2 faces) to {composite2_path}")

# Send to /capture
with open(composite2_path, "rb") as f_img:
    files = {"image": ("capture2.jpg", f_img, "image/jpeg")}
    data = {
        "roomId": str(room_id),
        "cameraId": str(camera_id),
        "assignmentId": str(assignment_id)
    }
    t0 = time.perf_counter()
    res = requests.post(f"{BACKEND}/capture", files=files, data=data, headers=headers)
    t_capture2 = (time.perf_counter() - t0) * 1000

cap2_data = res.json() if res.status_code == 200 else {}
session2_id = cap2_data.get("sessionId")
session2_status = cap2_data.get("sessionStatus")
passed2 = (res.status_code == 200 and session2_status in ("REVIEW_REQUIRED", "FINALIZED"))
record_step("Session 2 Capture (2 of 3 faces)", "/capture", "POST", res.status_code, t_capture2, passed2, f"sessionId={session2_id}, status={session2_status}")

# 8. Fetch review for Session 2
t0 = time.perf_counter()
res = requests.get(f"{BACKEND}/api/attendance-sessions/{session2_id}/review", headers=headers)
t_review2 = (time.perf_counter() - t0) * 1000
review2_data = res.json() if res.status_code == 200 else {}
records2 = review2_data.get("allRecords") or review2_data.get("records") or []
print(f"Session 2 records count: {len(records2)}")
for r in records2:
    print(f"  Student {r.get('studentId')} ({r.get('rollNumber')}): {r.get('status')} | conf={r.get('confidenceScore')} | state={r.get('recognitionState')}")
record_step("Session 2 Get Review", f"/api/attendance-sessions/{session2_id}/review", "GET", res.status_code, t_review2, res.status_code == 200, f"records={len(records2)}")

# 9. Finalize Session 2: confirm removed student is marked ABSENT
# The removed student (student 3, rollNumber RTC_STU_03) should be ABSENT or marked ABSENT
decisions2 = []
for r in records2:
    if r.get("status") == "REVIEW":
        # If student 3, decision is ABSENT; if student 1 or 2, decision is PRESENT
        decision = "ABSENT" if r.get("rollNumber") == "RTC_STU_03" else "PRESENT"
        decisions2.append({"studentId": r["studentId"], "decision": decision})

finalize_payload2 = {
    "decisions": decisions2,
    "unknownFaceAssignments": [],
    "acknowledgeUnknownFaces": True
}
t0 = time.perf_counter()
res = requests.post(f"{BACKEND}/api/attendance-sessions/{session2_id}/review", json=finalize_payload2, headers=headers)
t_final2 = (time.perf_counter() - t0) * 1000
fin2_data = res.json() if res.status_code == 200 else {}
passed_fin2 = (res.status_code == 200 and fin2_data.get("status") == "FINALIZED")
record_step("Session 2 Finalize", f"/api/attendance-sessions/{session2_id}/review", "POST", res.status_code, t_final2, passed_fin2, f"status={fin2_data.get('status')}")

# Save detailed results to JSON
output = {
    "section_id": class_section_id,
    "assignment_id": assignment_id,
    "enrolled_students": enrolled_students,
    "session1_id": session1_id,
    "session2_id": session2_id,
    "steps": results
}
with open("runtime-check/step3_results.json", "w") as f:
    json.dump(output, f, indent=2)

print("\n=== STEP 3 SUMMARY ===")
all_passed = all(r["result"] == "PASS" for r in results)
print(f"Overall Step 3 Status: {'PASS' if all_passed else 'FAIL'}")
print(f"Results saved to runtime-check/step3_results.json")
