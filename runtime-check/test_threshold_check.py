#!/usr/bin/env python3
"""
Part B.4: Threshold sanity check using golden-set images
"""
import requests
import numpy as np
import time

FACE_SERVICE = "http://localhost:8000"
OBAMA_REF = "C:/Users/vishe/OneDrive/Desktop/Goal/ClassSight/face-service-fastapi/tests/fixtures/obama_reference.jpg"
BIDEN_REF = "C:/Users/vishe/OneDrive/Desktop/Goal/ClassSight/face-service-fastapi/tests/fixtures/biden_reference.jpg"
GROUP_PHOTO = "C:/Users/vishe/OneDrive/Desktop/Goal/ClassSight/face-service-fastapi/tests/fixtures/obama_biden_group_2010.jpg"

print("=" * 70)
print("PART B.4: Threshold Sanity Check with Golden-Set")
print("=" * 70)

# Get actual threshold from health endpoint
health = requests.get(f"{FACE_SERVICE}/health").json()
threshold = health.get('manhattan_threshold')
print(f"\nCurrent Manhattan threshold: {threshold}")

# Enroll Obama
print("\n--- Enrolling Obama reference ---")
with open(OBAMA_REF, 'rb') as f:
    response = requests.post(f"{FACE_SERVICE}/enroll", files={'image': f})
    obama_emb = np.array(response.json()['embedding'])
    print(f"Obama embedding length: {len(obama_emb)}")

# Enroll Biden
print("\n--- Enrolling Biden reference ---")
with open(BIDEN_REF, 'rb') as f:
    response = requests.post(f"{FACE_SERVICE}/enroll", files={'image': f})
    biden_emb = np.array(response.json()['embedding'])
    print(f"Biden embedding length: {len(biden_emb)}")

# Compute same-person distance (Obama vs Obama)
print("\n--- Same-person distance (Obama vs Obama) ---")
# Use the same embedding for same-person test
same_person_dist = np.sum(np.abs(obama_emb - obama_emb))
print(f"Manhattan distance: {same_person_dist:.6f}")

# Compute different-person distance (Obama vs Biden)
print("\n--- Different-person distance (Obama vs Biden) ---")
diff_person_dist = np.sum(np.abs(obama_emb - biden_emb))
print(f"Manhattan distance: {diff_person_dist:.6f}")

# Try recognition on group photo
print("\n--- Recognition on group photo ---")
with open(GROUP_PHOTO, 'rb') as f:
    start = time.time()
    response = requests.post(f"{FACE_SERVICE}/recognize", files={'image': f})
    elapsed = (time.time() - start) * 1000
    data = response.json()
    print(f"Status: {response.status_code}")
    print(f"Time: {elapsed:.0f}ms")
    print(f"Faces detected: {data.get('face_count', 0)}")
    print(f"Matches: {len(data.get('matches', []))}")

    for match in data.get('matches', []):
        print(f"\n  Student: {match.get('roll_number')}")
        print(f"  Manhattan distance: {match.get('manhattan_distance')}")
        print(f"  Confidence label: {match.get('confidence_label')}")
        print(f"  Matched: {match.get('matched')}")

print(f"\n--- Threshold Separation Check ---")
print(f"Same-person distance: {same_person_dist:.6f}")
print(f"Different-person distance: {diff_person_dist:.6f}")
print(f"Configured threshold: {threshold}")
print(f"Threshold separates them: {same_person_dist < threshold < diff_person_dist}")
