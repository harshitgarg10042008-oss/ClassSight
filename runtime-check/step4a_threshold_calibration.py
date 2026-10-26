#!/usr/bin/env python3
"""
Step 4a: Threshold calibration with the service's real embedder
- At least 500 genuine pairs and 2000 impostor pairs from LFW
- Embeddings generated via running face-service POST /enroll (FaceNet 128-d L2-normalized)
- Manhattan (L1) distance metric
- Reports: min/mean/max, 1st/5th/50th/95th/99th percentiles for each group
- EER, threshold at FAR=1% and FAR=0.1% with TAR
- FAR + TAR at current threshold of 15.0
All numbers explicitly labeled: "simulated on LFW, NOT classroom accuracy"
"""
import os
import random
import requests
import json
import numpy as np

random.seed(42)
np.random.seed(42)

FACE_SERVICE = "http://localhost:8000"
LFW_DIR = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"

# 1. Select people with >= 4 images
people = sorted([d for d in os.listdir(LFW_DIR) if os.path.isdir(os.path.join(LFW_DIR, d))])
candidates = [p for p in people if len([f for f in os.listdir(os.path.join(LFW_DIR, p)) if f.lower().endswith(('.jpg', '.jpeg'))]) >= 4]

random.seed(42)
selected_people = random.sample(candidates, 100)

print(f"Selected {len(selected_people)} people for genuine & impostor pairs")

# 2. Embed images using the service
embeddings_by_person = {}
total_embedded = 0

for p in selected_people:
    p_dir = os.path.join(LFW_DIR, p)
    imgs = sorted([f for f in os.listdir(p_dir) if f.lower().endswith(('.jpg', '.jpeg'))])
    # pick 4 images that have valid single faces
    embs = []
    for img_name in imgs:
        img_path = os.path.join(p_dir, img_name)
        try:
            with open(img_path, "rb") as f:
                res = requests.post(f"{FACE_SERVICE}/enroll", files={"image": (img_name, f, "image/jpeg")}, timeout=10)
                if res.status_code == 200:
                    emb = np.array(res.json()["embedding"], dtype=np.float64)
                    embs.append(emb)
                    if len(embs) == 4:
                        break
        except Exception as e:
            pass
    if len(embs) >= 4:
        embeddings_by_person[p] = embs
        total_embedded += len(embs)

print(f"Successfully embedded 4 images for {len(embeddings_by_person)} people ({total_embedded} total images)")

# 3. Generate genuine pairs
genuine_distances = []
for p, embs in embeddings_by_person.items():
    for i in range(len(embs)):
        for j in range(i + 1, len(embs)):
            dist = float(np.sum(np.abs(embs[i] - embs[j])))
            genuine_distances.append(dist)

genuine_distances = np.array(genuine_distances)
print(f"Generated {len(genuine_distances)} genuine pairs")

# 4. Generate impostor pairs
person_list = list(embeddings_by_person.keys())
impostor_distances = []
random.seed(42)

while len(impostor_distances) < 2500:
    p1, p2 = random.sample(person_list, 2)
    e1 = random.choice(embeddings_by_person[p1])
    e2 = random.choice(embeddings_by_person[p2])
    dist = float(np.sum(np.abs(e1 - e2)))
    impostor_distances.append(dist)

impostor_distances = np.array(impostor_distances)
print(f"Generated {len(impostor_distances)} impostor pairs")

# 5. Compute statistics
def get_stats(arr):
    return {
        "count": int(len(arr)),
        "min": round(float(np.min(arr)), 4),
        "mean": round(float(np.mean(arr)), 4),
        "max": round(float(np.max(arr)), 4),
        "std": round(float(np.std(arr)), 4),
        "p01": round(float(np.percentile(arr, 1)), 4),
        "p05": round(float(np.percentile(arr, 5)), 4),
        "p50": round(float(np.percentile(arr, 50)), 4),
        "p95": round(float(np.percentile(arr, 95)), 4),
        "p99": round(float(np.percentile(arr, 99)), 4),
    }

gen_stats = get_stats(genuine_distances)
imp_stats = get_stats(impostor_distances)

# 6. EER and thresholds at specific FARs
# Sweeping threshold across min(genuine) to max(impostor)
thresholds = np.linspace(min(np.min(genuine_distances), np.min(impostor_distances)),
                         max(np.max(genuine_distances), np.max(impostor_distances)), 5000)

fars = []
frrs = []
for t in thresholds:
    far = np.mean(impostor_distances < t)
    frr = np.mean(genuine_distances >= t)
    fars.append(far)
    frrs.append(frr)

fars = np.array(fars)
frrs = np.array(frrs)

# EER: where FAR == FRR
eer_idx = np.nanargmin(np.abs(fars - frrs))
eer = float((fars[eer_idx] + frrs[eer_idx]) / 2.0)
eer_threshold = float(thresholds[eer_idx])

# Threshold at FAR = 1% (0.01)
far_1pct_idx = np.where(fars <= 0.01)[0]
if len(far_1pct_idx) > 0:
    idx_1pct = far_1pct_idx[-1]
    t_1pct = float(thresholds[idx_1pct])
    far_1pct = float(fars[idx_1pct])
    tar_1pct = float(1.0 - frrs[idx_1pct])
else:
    t_1pct, far_1pct, tar_1pct = None, None, None

# Threshold at FAR = 0.1% (0.001)
far_01pct_idx = np.where(fars <= 0.001)[0]
if len(far_01pct_idx) > 0:
    idx_01pct = far_01pct_idx[-1]
    t_01pct = float(thresholds[idx_01pct])
    far_01pct = float(fars[idx_01pct])
    tar_01pct = float(1.0 - frrs[idx_01pct])
else:
    t_01pct, far_01pct, tar_01pct = None, None, None

# Current production threshold = 15.0
prod_t = 15.0
prod_far = float(np.mean(impostor_distances < prod_t))
prod_tar = float(np.mean(genuine_distances < prod_t))

results = {
    "disclaimer": "simulated on LFW, NOT classroom accuracy",
    "method": "FaceNet InceptionResnetV1 (vggface2, 128-d orthonormal projection, L2 normalized) with Manhattan (L1) distance",
    "genuine_pairs": gen_stats,
    "impostor_pairs": imp_stats,
    "eer": round(eer * 100, 2),
    "eer_threshold": round(eer_threshold, 4),
    "at_far_1pct": {
        "threshold": round(t_1pct, 4) if t_1pct else None,
        "actual_far_pct": round(far_1pct * 100, 3) if far_1pct is not None else None,
        "tar_pct": round(tar_1pct * 100, 2) if tar_1pct else None
    },
    "at_far_01pct": {
        "threshold": round(t_01pct, 4) if t_01pct else None,
        "actual_far_pct": round(far_01pct * 100, 3) if far_01pct is not None else None,
        "tar_pct": round(tar_01pct * 100, 2) if tar_01pct else None
    },
    "at_current_15_0": {
        "threshold": 15.0,
        "far_pct": round(prod_far * 100, 2),
        "tar_pct": round(prod_tar * 100, 2)
    }
}

os.makedirs("runtime-check", exist_ok=True)
with open("runtime-check/step4a_results.json", "w") as f:
    json.dump(results, f, indent=2)

print("\n" + "=" * 60)
print("STEP 4a CALIBRATION RESULTS (simulated on LFW, NOT classroom accuracy)")
print("=" * 60)
print(f"Genuine Pairs: count={gen_stats['count']}, min={gen_stats['min']}, mean={gen_stats['mean']}, max={gen_stats['max']}")
print(f"  Percentiles (1st/5th/50th/95th/99th): {gen_stats['p01']} / {gen_stats['p05']} / {gen_stats['p50']} / {gen_stats['p95']} / {gen_stats['p99']}")
print(f"Impostor Pairs: count={imp_stats['count']}, min={imp_stats['min']}, mean={imp_stats['mean']}, max={imp_stats['max']}")
print(f"  Percentiles (1st/5th/50th/95th/99th): {imp_stats['p01']} / {imp_stats['p05']} / {imp_stats['p50']} / {imp_stats['p95']} / {imp_stats['p99']}")
print(f"Equal Error Rate (EER): {results['eer']}% at distance threshold {results['eer_threshold']}")
print(f"At FAR=1%: threshold={results['at_far_1pct']['threshold']}, TAR={results['at_far_1pct']['tar_pct']}% (actual FAR={results['at_far_1pct']['actual_far_pct']}%)")
print(f"At FAR=0.1%: threshold={results['at_far_01pct']['threshold']}, TAR={results['at_far_01pct']['tar_pct']}% (actual FAR={results['at_far_01pct']['actual_far_pct']}%)")
print(f"At current 15.0: FAR={results['at_current_15_0']['far_pct']}%, TAR={results['at_current_15_0']['tar_pct']}%")
