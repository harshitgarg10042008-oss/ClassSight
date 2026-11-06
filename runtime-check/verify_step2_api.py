#!/usr/bin/env python3
"""
verify_step2_api.py: End-to-end API verification of tiered decision logic with RTC_ data.
Scenarios:
1. Enroll 3 LFW students in section RTC_SEC_STEP2.
2. Session with all 3 present -> all 3 auto-present in AUTO tier.
3. Session with 1 removed (2 present, 1 absent) -> removed student flagged as ABSENT_CANDIDATE.
4. Session with 3 enrolled + 1 added outsider -> outsider face is UNKNOWN or REVIEW, NEVER auto-present.
"""

import io
import json
import os
import subprocess
import sys
import time
import requests
from PIL import Image

BACKEND = "http://localhost:8080"
FACE_SERVICE = "http://localhost:8000"

def clean_rtc_data():
    cleanup_sql = """
    DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM attendance_sessions WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%'));
    DELETE FROM attendance_sessions WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%');
    DELETE FROM student_face_embeddings WHERE student_id IN (SELECT id FROM students WHERE roll_number LIKE 'RTC_%');
    DELETE FROM student_enrollments WHERE student_id IN (SELECT id FROM students WHERE roll_number LIKE 'RTC_%');
    DELETE FROM students WHERE roll_number LIKE 'RTC_%';
    DELETE FROM faculty_subject_assignments WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%');
    DELETE FROM timetable_slots WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%');
    DELETE FROM class_sections WHERE name LIKE 'RTC_%';
    """
    subprocess.run(
        ["docker", "exec", "classsight-postgres-1", "psql", "-U", "classsight", "-d", "classsight", "-c", cleanup_sql],
        capture_output=True, text=True
    )

clean_rtc_data()

# 1. Login as teacher
res = requests.post(f"{BACKEND}/auth/login", json={"usernameOrEmail": "teacher", "password": "teacher123"})
if res.status_code != 200:
    print(f"Login failed: {res.text}")
    sys.exit(1)

token = res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}
print("Authenticated successfully as teacher.")

# 2. Load dataset manifest
with open("runtime-check/dataset_manifest.json") as f:
    manifest = json.load(f)

class_people = manifest["class_identities"][:3]
outsider_person = manifest["outsider_identities"][0]
print(f"Enrolling 3 students: {[p['name'] for p in class_people]}")
print(f"Outsider identity: {outsider_person['name']}")

# 3. Create class section
create_class_payload = {
    "name": "RTC_SEC_STEP2",
    "subjectId": 1,
    "roomId": 1,
    "academicYear": 2026
}
res = requests.post(f"{BACKEND}/students/classes", json=create_class_payload, headers=headers)
if res.status_code != 200:
    print(f"Failed to create class section: {res.text}")
    sys.exit(1)

class_info = res.json()
class_section_id = class_info["id"]
assignment_id = class_info["assignmentId"]
subject_id = class_info["subjectId"]
room_id = class_info["roomId"]
camera_id = 3

print(f"Created Section RTC_SEC_STEP2 (ID={class_section_id}, Assignment={assignment_id})")

# 4. Enroll 3 students
enrolled_students = []
for i, person in enumerate(class_people):
    roll_num = f"RTC_S2_STU_{i+1:02d}"
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
        res = requests.post(f"{BACKEND}/students/enroll-single", files=files, data=data, headers=headers)
        if res.status_code != 200:
            print(f"Failed to enroll {name}: {res.text}")
            sys.exit(1)
        resp_data = res.json()
        stu = resp_data.get("student", resp_data)
        enrolled_students.append(stu)
        print(f"Enrolled {name} -> Student ID={stu['id']}, Roll={roll_num}")


def build_side_by_side(image_paths):
    pil_images = [Image.open(p).convert("RGB") for p in image_paths]
    w = sum(img.size[0] for img in pil_images)
    h = max(img.size[1] for img in pil_images)
    canvas = Image.new("RGB", (w, h))
    x = 0
    for img in pil_images:
        canvas.paste(img, (x, 0))
        x += img.size[0]
    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


# ── Scenario 1: All 3 present ────────────────────────────────────────────────
print("\n--- Scenario 1: All 3 Students Present ---")
img_s1 = build_side_by_side([p["test_path"] for p in class_people])
capture_data = {
    "roomId": str(room_id),
    "cameraId": str(camera_id),
    "assignmentId": str(assignment_id)
}
res = requests.post(
    f"{BACKEND}/capture",
    data=capture_data,
    files={"image": ("capture1.jpg", img_s1, "image/jpeg")},
    headers=headers
)
if res.status_code != 200:
    print(f"Scenario 1 capture failed: {res.text}")
    sys.exit(1)

s1_session = res.json()
s1_id = s1_session["sessionId"]
print(f"Session 1 created: ID={s1_id}, status={s1_session.get('sessionStatus')}")

# Review endpoint to inspect records
res_rev = requests.get(f"{BACKEND}/api/attendance-sessions/{s1_id}/review", headers=headers)
rev1_data = res_rev.json()
all_records_1 = rev1_data.get("allRecords", [])
print(f"Session 1 records ({len(all_records_1)}):")
for r in all_records_1:
    print(f"  {r['rollNumber']}: status={r['status']}, state={r['recognitionState']}, conf={r['confidenceScore']}")
    assert r["status"] == "PRESENT", f"Expected PRESENT for {r['rollNumber']}, got {r['status']}"
    assert r["recognitionState"] == "RECOGNIZED", f"Expected RECOGNIZED, got {r['recognitionState']}"

print("Scenario 1 passed: All 3 enrolled students auto-present in AUTO tier!")


# ── Scenario 2: Student 3 Removed ─────────────────────────────────────────────
print("\n--- Scenario 2: Student 3 Removed (1 Absent) ---")
img_s2 = build_side_by_side([class_people[0]["test_path"], class_people[1]["test_path"]])
res = requests.post(
    f"{BACKEND}/capture",
    data=capture_data,
    files={"image": ("capture2.jpg", img_s2, "image/jpeg")},
    headers=headers
)
if res.status_code != 200:
    print(f"Scenario 2 capture failed: {res.text}")
    sys.exit(1)

s2_session = res.json()
s2_id = s2_session["sessionId"]
print(f"Session 2 created: ID={s2_id}, status={s2_session.get('sessionStatus')}")

res_rev2 = requests.get(f"{BACKEND}/api/attendance-sessions/{s2_id}/review", headers=headers)
rev2_data = res_rev2.json()
all_records_2 = rev2_data.get("allRecords", [])
print(f"Session 2 records ({len(all_records_2)}):")
for r in all_records_2:
    print(f"  {r['rollNumber']}: status={r['status']}, state={r['recognitionState']}, conf={r['confidenceScore']}")
    if r["studentId"] == enrolled_students[2]["id"]:
        assert r["status"] == "REVIEW", f"Expected student 3 to be in REVIEW status, got {r['status']}"
        assert r["recognitionState"] == "ABSENT_CANDIDATE", f"Expected ABSENT_CANDIDATE, got {r['recognitionState']}"
    else:
        assert r["status"] == "PRESENT", f"Expected present student to be PRESENT, got {r['status']}"

print("Scenario 2 passed: Missing student is ABSENT_CANDIDATE in REVIEW queue!")


# ── Scenario 3: Added Outsider Face ───────────────────────────────────────────
print("\n--- Scenario 3: Added Outsider Face ---")
img_s3 = build_side_by_side([
    class_people[0]["test_path"],
    class_people[1]["test_path"],
    class_people[2]["test_path"],
    outsider_person["test_path"]
])

res = requests.post(
    f"{BACKEND}/capture",
    data=capture_data,
    files={"image": ("capture3.jpg", img_s3, "image/jpeg")},
    headers=headers
)
if res.status_code != 200:
    print(f"Scenario 3 capture failed: {res.text}")
    sys.exit(1)

s3_session = res.json()
s3_id = s3_session["sessionId"]
print(f"Session 3 created: ID={s3_id}, status={s3_session.get('sessionStatus')}")

res_rev3 = requests.get(f"{BACKEND}/api/attendance-sessions/{s3_id}/review", headers=headers)
rev3_data = res_rev3.json()
diagnostics = rev3_data.get("diagnostics", [])
print(f"Session 3 diagnostics ({len(diagnostics)} detections):")
outsider_flagged = False
for d in diagnostics:
    sid = d.get("student_id")
    tier = d.get("tier")
    matched = d.get("matched")
    d1 = d.get("distance")
    print(f"  Face #{d.get('face_index')}: student_id={sid}, tier={tier}, matched={matched}, distance={d1}")
    if sid is None or not matched or tier in ("UNKNOWN", "REVIEW"):
        outsider_flagged = True

assert outsider_flagged, "Outsider face MUST be flagged as UNKNOWN or REVIEW, not auto-present!"
assert rev3_data.get("status") == "REVIEW_REQUIRED", "Session with outsider face MUST require faculty review!"

print("\nScenario 3 passed: Outsider face was properly flagged (UNKNOWN/REVIEW) and NEVER auto-present!")
print("\n>>> ALL STEP 2 API SCENARIOS VERIFIED SUCCESSFULLY! <<<")
