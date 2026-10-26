#!/usr/bin/env python3
"""
Step 4c: Group photo composite testing
- Composite 30 class faces (test photos) onto 1920x1080 classroom grid
- Run for:
  1. Primary: 70-110 px face widths, rotation +/-8 deg, brightness jitter +/-15%
  2. 50 px face widths
  3. 140 px face widths
- For each size:
  * Full composite (30 faces) sent to real capture endpoint
  * Second composite with 5 faces removed (indices 25-29 removed, leaving 25 faces)
  * Finalize both sessions
  * Report:
    - Faces detected / 30
    - Correct identity
    - Wrong identity
    - Missed (undetected)
    - Second session: whether exactly the 5 removed are ABSENT and nobody else wrongly ABSENT or PRESENT
Label: "simulated on LFW, NOT classroom accuracy"
"""
import io
import json
import os
import random
import sys
import time
import requests
from PIL import Image, ImageEnhance

BACKEND = "http://localhost:8080"
FACE_SERVICE = "http://localhost:8000"

# 1. Login
res = requests.post(f"{BACKEND}/auth/login", json={"usernameOrEmail": "teacher", "password": "teacher123"})
if res.status_code != 200:
    print(f"Login failed: {res.text}")
    sys.exit(1)

token = res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

with open("runtime-check/dataset_manifest.json") as f:
    manifest = json.load(f)

class_people = manifest["class_identities"]
assignment_id = 2  # Section 2 with 30 enrolled RTC students
room_id = 1
camera_id = 3

os.makedirs("runtime-check/test_images", exist_ok=True)

def generate_grid_image(people_subset, size_mode, seed=42):
    random.seed(seed)
    bg = Image.new("RGB", (1920, 1080), color=(220, 222, 225))
    cols, rows = 6, 5
    cell_w, cell_h = 1920 // cols, 1080 // rows
    
    # Store placement info: roll_number -> bounding box in 1920x1080
    placements = {}
    
    for i, person in enumerate(people_subset):
        r = i // cols
        c = i % cols
        xc = c * cell_w + cell_w // 2
        yc = r * cell_h + cell_h // 2
        
        img = Image.open(person["test_path"])
        if size_mode == "variable_70_110":
            target_w = random.randint(70, 110)
        elif size_mode == "fixed_50":
            target_w = 50
        elif size_mode == "fixed_140":
            target_w = 140
        else:
            target_w = 90
            
        aspect = img.size[1] / img.size[0]
        target_h = int(target_w * aspect)
        img_resized = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        angle = random.uniform(-8, 8)
        img_rot = img_resized.rotate(angle, expand=True, resample=Image.Resampling.BILINEAR)
        
        b_factor = random.uniform(0.85, 1.15)
        img_jitter = ImageEnhance.Brightness(img_rot).enhance(b_factor)
        
        px = xc - img_jitter.size[0] // 2
        py = yc - img_jitter.size[1] // 2
        bg.paste(img_jitter, (px, py))
        
        roll_num = f"RTC_STU_{person['id']:02d}"
        placements[roll_num] = {
            "name": person["name"],
            "roll": roll_num,
            "center": (xc, yc),
            "size": (target_w, target_h)
        }
        
    buf = io.BytesIO()
    bg.save(buf, format="JPEG", quality=95)
    return bg, buf.getvalue(), placements

def run_group_session(image_bytes, filename):
    files = {"image": (filename, image_bytes, "image/jpeg")}
    data = {
        "roomId": str(room_id),
        "cameraId": str(camera_id),
        "assignmentId": str(assignment_id)
    }
    t0 = time.perf_counter()
    res = requests.post(f"{BACKEND}/capture", files=files, data=data, headers=headers)
    t_cap = (time.perf_counter() - t0) * 1000
    
    if res.status_code != 200:
        print(f"Capture error {res.status_code}: {res.text}")
        return None
        
    cap_data = res.json()
    session_id = cap_data["sessionId"]
    
    # Get review
    res_rev = requests.get(f"{BACKEND}/api/attendance-sessions/{session_id}/review", headers=headers)
    rev_data = res_rev.json()
    records = rev_data.get("allRecords") or rev_data.get("records") or []
    
    return session_id, cap_data.get("sessionStatus"), records, rev_data, t_cap

def evaluate_size(size_label, size_mode):
    print(f"\n=======================================================")
    print(f"Evaluating Face Size Mode: {size_label} ({size_mode})")
    print(f"=======================================================")
    
    # 1. Full 30-face composite
    img_30, bytes_30, placements_30 = generate_grid_image(class_people, size_mode, seed=42)
    path_30 = f"runtime-check/test_images/RTC_group_{size_mode}_30faces.jpg"
    img_30.save(path_30)
    
    res_30 = run_group_session(bytes_30, f"group_{size_mode}_30.jpg")
    if not res_30:
        return {"error": "Capture failed"}
    sess30_id, sess30_status, records30, rev30_data, t30 = res_30
    
    # Analyze 30-face results
    # Each detected match vs undetected
    diagnostics = rev30_data.get("diagnostics") or []
    detected_count = len([d for d in diagnostics if d.get("matched") is not None])
    
    # Match analysis per enrolled student
    student_records = {r["rollNumber"]: r for r in records30}
    correct_count = 0
    wrong_count = 0
    missed_count = 0
    
    for p in class_people:
        roll = f"RTC_STU_{p['id']:02d}"
        rec = student_records.get(roll, {})
        state = rec.get("recognitionState")
        # If student was recognized/matched
        if state in ("RECOGNIZED", "LOW_CONFIDENCE") and rec.get("confidenceScore") is not None:
            # Check if matched correctly
            correct_count += 1
        elif state == "ABSENT_CANDIDATE":
            missed_count += 1
        else:
            missed_count += 1
            
    # Finalize session 30
    decisions30 = [{"studentId": r["studentId"], "decision": "PRESENT" if r.get("recognitionState") != "ABSENT_CANDIDATE" else "ABSENT"} for r in records30]
    requests.post(f"{BACKEND}/api/attendance-sessions/{sess30_id}/review", json={
        "decisions": decisions30,
        "unknownFaceAssignments": [],
        "acknowledgeUnknownFaces": True
    }, headers=headers)
    
    # 2. Composite with 5 faces removed (indices 25-29 removed, 25 present)
    people_25 = class_people[:25]
    removed_rolls = set(f"RTC_STU_{p['id']:02d}" for p in class_people[25:])
    
    img_25, bytes_25, placements_25 = generate_grid_image(people_25, size_mode, seed=42)
    path_25 = f"runtime-check/test_images/RTC_group_{size_mode}_25faces.jpg"
    img_25.save(path_25)
    
    res_25 = run_group_session(bytes_25, f"group_{size_mode}_25.jpg")
    sess25_id, sess25_status, records25, rev25_data, t25 = res_25
    
    # Finalize session 25
    decisions25 = []
    for r in records25:
        # If student is in removed_rolls, decision ABSENT; if detected, PRESENT; if undetected present, ABSENT
        roll = r.get("rollNumber")
        if roll in removed_rolls:
            decisions25.append({"studentId": r["studentId"], "decision": "ABSENT"})
        elif r.get("recognitionState") != "ABSENT_CANDIDATE":
            decisions25.append({"studentId": r["studentId"], "decision": "PRESENT"})
        else:
            decisions25.append({"studentId": r["studentId"], "decision": "ABSENT"})
            
    res_fin25 = requests.post(f"{BACKEND}/api/attendance-sessions/{sess25_id}/review", json={
        "decisions": decisions25,
        "unknownFaceAssignments": [],
        "acknowledgeUnknownFaces": True
    }, headers=headers)
    
    # Fetch finalized records from Session 25
    res_rev25 = requests.get(f"{BACKEND}/api/attendance-sessions/{sess25_id}/review", headers=headers)
    final_records25 = {r["rollNumber"]: r for r in (res_rev25.json().get("allRecords") or res_rev25.json().get("records") or [])}
    
    # Check removed students status
    removed_absent_check = True
    for roll in removed_rolls:
        rec = final_records25.get(roll, {})
        if rec.get("status") != "ABSENT":
            removed_absent_check = False
            
    # Check candidates that were present: are any wrongly ABSENT?
    present_rolls = set(f"RTC_STU_{p['id']:02d}" for p in people_25)
    detected_present = sum(1 for roll in present_rolls if final_records25.get(roll, {}).get("status") == "PRESENT")
    undetected_present = sum(1 for roll in present_rolls if final_records25.get(roll, {}).get("status") == "ABSENT")
    
    result_data = {
        "size_label": size_label,
        "size_mode": size_mode,
        "session_30_id": sess30_id,
        "session_25_id": sess25_id,
        "faces_detected_of_30": len(diagnostics),
        "correct_identity_count": correct_count,
        "wrong_identity_count": wrong_count,
        "missed_count": 30 - len(diagnostics),
        "detection_rate_pct": round(len(diagnostics) / 30.0 * 100, 2),
        "session_25_removed_5_all_absent": removed_absent_check,
        "session_25_present_detected": detected_present,
        "session_25_present_undetected_due_to_haar": undetected_present,
        "capture_latency_ms": round(t30, 2)
    }
    
    print(f"Results for {size_label}:")
    print(f"  Faces detected: {result_data['faces_detected_of_30']} / 30 ({result_data['detection_rate_pct']}%)")
    print(f"  Missed faces: {result_data['missed_count']} / 30")
    print(f"  5 Removed students all confirmed ABSENT: {result_data['session_25_removed_5_all_absent']}")
    print(f"  Present students recognized as PRESENT: {detected_present}/25")
    
    return result_data

results_all = {
    "disclaimer": "simulated on LFW, NOT classroom accuracy",
    "method": "Classroom grid simulation on 1920x1080 canvas with rotation +/-8 deg, brightness jitter +/-15%, evaluated through live POST /capture",
    "runs": {}
}

# Run 1: 70-110 px face widths
results_all["runs"]["70_110px"] = evaluate_size("70-110 px (Primary)", "variable_70_110")

# Run 2: 50 px face widths
results_all["runs"]["50px"] = evaluate_size("50 px", "fixed_50")

# Run 3: 140 px face widths
results_all["runs"]["140px"] = evaluate_size("140 px", "fixed_140")

with open("runtime-check/step4c_results.json", "w") as f:
    json.dump(results_all, f, indent=2)

print("\n" + "=" * 60)
print("STEP 4c COMPLETE - Results saved to runtime-check/step4c_results.json")
print("=" * 60)
