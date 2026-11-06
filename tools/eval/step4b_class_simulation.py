#!/usr/bin/env python3
"""
Step 4b: Class simulation
- Enroll 30 class identities through real enrollment endpoint into one class
- Probe with 30 class photos (test photos, different from enrollment) + 30 outsider photos
- Compute Manhattan (L1) distances to all 30 enrolled students
- Report for:
  1. Threshold = 15.0 (current production)
  2. Threshold = 9.5622 (EER)
  3. Threshold = 9.3734 (FAR=1%)
  4. Threshold = 7.6582 (FAR=0.1%)
- Metrics:
  * Rank-1 correct rate (class probes matched to correct enrolled identity)
  * Wrong-identity rate (class probes matched to wrong enrolled identity)
  * Class unknown rate (class probes with d1 >= threshold)
  * Outsider false-accept rate (outsider probes with d1 < threshold)
  * Outsider unknown rate (outsider probes with d1 >= threshold)
Label: "simulated on LFW, NOT classroom accuracy"
"""
import json
import os
import sys
import time
import requests
import numpy as np

BACKEND = "http://localhost:8080"
FACE_SERVICE = "http://localhost:8000"

# 1. Login
res = requests.post(f"{BACKEND}/auth/login", json={"usernameOrEmail": "teacher", "password": "teacher123"})
if res.status_code != 200:
    print(f"Login failed: {res.text}")
    sys.exit(1)

token = res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# Load manifest and 4a thresholds
with open("runtime-check/dataset_manifest.json") as f:
    manifest = json.load(f)

with open("runtime-check/step4a_results.json") as f:
    step4a = json.load(f)

class_people = manifest["class_identities"]
outsider_people = manifest["outsider_identities"]

# Get section 2 (RTC_SEC_A created in Step 3)
class_section_id = 2
subject_id = 1

# Check already enrolled students
res = requests.get(f"{BACKEND}/students?classSectionId={class_section_id}", headers=headers)
existing_roster = res.json() if res.status_code == 200 else []
existing_rolls = {s["rollNumber"]: s for s in existing_roster}

print(f"Existing enrolled RTC students in section {class_section_id}: {len(existing_rolls)}")

# Enroll remaining students (from index 3 to 29)
enrolled_students = {}
for i, person in enumerate(class_people):
    roll_num = f"RTC_STU_{i+1:02d}"
    name = f"RTC_{person['name']}"
    
    if roll_num in existing_rolls:
        enrolled_students[roll_num] = {
            "student_id": existing_rolls[roll_num]["id"],
            "roll_number": roll_num,
            "name": name,
            "person_name": person["name"]
        }
        continue

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
        if res.status_code == 200 and res.json().get("status") == "success":
            stu_info = res.json()["student"]
            enrolled_students[roll_num] = {
                "student_id": stu_info["id"],
                "roll_number": roll_num,
                "name": name,
                "person_name": person["name"]
            }
        else:
            print(f"Failed to enroll {roll_num}: {res.status_code} {res.text}")

print(f"Total enrolled class students: {len(enrolled_students)}")

# Fetch the reference embeddings for all 30 enrolled students from face service
enrolled_embeddings = []
for i, person in enumerate(class_people):
    roll_num = f"RTC_STU_{i+1:02d}"
    with open(person["enroll_path"], "rb") as f_img:
        res = requests.post(f"{FACE_SERVICE}/enroll", files={"image": f_img})
        emb = np.array(res.json()["embedding"], dtype=np.float64)
        enrolled_embeddings.append(emb)

enrolled_embeddings = np.array(enrolled_embeddings)  # shape (30, 128)
print(f"Enrolled embeddings matrix shape: {enrolled_embeddings.shape}")

# 2. Probe with 30 class test photos
class_probe_distances = []  # will store (min_dist, closest_idx, true_idx)
for true_idx, person in enumerate(class_people):
    test_path = person["test_path"]
    with open(test_path, "rb") as f_img:
        res = requests.post(f"{FACE_SERVICE}/enroll", files={"image": f_img})
        probe_emb = np.array(res.json()["embedding"], dtype=np.float64)
    # Manhattan distance to all 30 enrolled students
    dists = np.sum(np.abs(enrolled_embeddings - probe_emb), axis=1)
    closest_idx = int(np.argmin(dists))
    min_dist = float(dists[closest_idx])
    class_probe_distances.append({
        "person": person["name"],
        "true_idx": true_idx,
        "closest_idx": closest_idx,
        "min_dist": min_dist,
        "correct_id": closest_idx == true_idx
    })

# 3. Probe with 30 outsider photos
outsider_probe_distances = []
for outsider in outsider_people:
    test_path = outsider["test_path"]
    with open(test_path, "rb") as f_img:
        res = requests.post(f"{FACE_SERVICE}/enroll", files={"image": f_img})
        probe_emb = np.array(res.json()["embedding"], dtype=np.float64)
    dists = np.sum(np.abs(enrolled_embeddings - probe_emb), axis=1)
    closest_idx = int(np.argmin(dists))
    min_dist = float(dists[closest_idx])
    outsider_probe_distances.append({
        "person": outsider["name"],
        "closest_idx": closest_idx,
        "min_dist": min_dist
    })

# 4. Evaluate at various thresholds
thresholds_to_evaluate = {
    "current_15_0": 15.0,
    "eer": step4a["eer_threshold"],
    "far_1pct": step4a["at_far_1pct"]["threshold"],
    "far_01pct": step4a["at_far_01pct"]["threshold"]
}

eval_results = {}
for name, thresh in thresholds_to_evaluate.items():
    if thresh is None:
        continue
    thresh = float(thresh)
    # Class metrics
    # rank-1 correct: min_dist < thresh AND closest_idx == true_idx
    # wrong-identity: min_dist < thresh AND closest_idx != true_idx
    # unknown: min_dist >= thresh
    class_correct = sum(1 for p in class_probe_distances if p["min_dist"] < thresh and p["closest_idx"] == p["true_idx"])
    class_wrong = sum(1 for p in class_probe_distances if p["min_dist"] < thresh and p["closest_idx"] != p["true_idx"])
    class_unknown = sum(1 for p in class_probe_distances if p["min_dist"] >= thresh)
    
    # Outsider metrics
    # false accept: min_dist < thresh
    # unknown (correct reject): min_dist >= thresh
    outsider_fa = sum(1 for p in outsider_probe_distances if p["min_dist"] < thresh)
    outsider_unknown = sum(1 for p in outsider_probe_distances if p["min_dist"] >= thresh)
    
    n_class = len(class_probe_distances)
    n_outsider = len(outsider_probe_distances)
    
    eval_results[name] = {
        "threshold": round(thresh, 4),
        "rank1_correct_rate_pct": round(class_correct / n_class * 100, 2),
        "wrong_identity_rate_pct": round(class_wrong / n_class * 100, 2),
        "class_unknown_rate_pct": round(class_unknown / n_class * 100, 2),
        "outsider_false_accept_rate_pct": round(outsider_fa / n_outsider * 100, 2),
        "outsider_unknown_rate_pct": round(outsider_unknown / n_outsider * 100, 2),
        "counts": {
            "class_correct": class_correct,
            "class_wrong": class_wrong,
            "class_unknown": class_unknown,
            "outsider_false_accept": outsider_fa,
            "outsider_unknown": outsider_unknown,
            "total_class_probes": n_class,
            "total_outsider_probes": n_outsider
        }
    }

output = {
    "disclaimer": "simulated on LFW, NOT classroom accuracy",
    "method": "Class simulation with 30 enrolled students in 1 class section, probed with 30 class test photos and 30 outsider photos using Manhattan L1 distance",
    "evaluations": eval_results,
    "class_probe_distances": class_probe_distances,
    "outsider_probe_distances": outsider_probe_distances
}

with open("runtime-check/step4b_results.json", "w") as f:
    json.dump(output, f, indent=2)

print("\n" + "=" * 70)
print("STEP 4b CLASS SIMULATION RESULTS (simulated on LFW, NOT classroom accuracy)")
print("=" * 70)
for k, v in eval_results.items():
    print(f"\nConfiguration: {k} (Threshold = {v['threshold']})")
    print(f"  Class Probes (N=30):")
    print(f"    Rank-1 Correct Rate: {v['rank1_correct_rate_pct']}% ({v['counts']['class_correct']}/30)")
    print(f"    Wrong Identity Rate: {v['wrong_identity_rate_pct']}% ({v['counts']['class_wrong']}/30)")
    print(f"    Class Unknown Rate:  {v['class_unknown_rate_pct']}% ({v['counts']['class_unknown']}/30)")
    print(f"  Outsider Probes (N=30):")
    print(f"    Outsider False-Accept Rate: {v['outsider_false_accept_rate_pct']}% ({v['counts']['outsider_false_accept']}/30)")
    print(f"    Outsider Unknown Rate:      {v['outsider_unknown_rate_pct']}% ({v['counts']['outsider_unknown']}/30)")
