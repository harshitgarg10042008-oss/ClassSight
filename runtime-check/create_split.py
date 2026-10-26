import os
import random
import json

lfw_dir = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"
all_people = sorted([d for d in os.listdir(lfw_dir) if os.path.isdir(os.path.join(lfw_dir, d))])
people_ge2 = [p for p in all_people if len([f for f in os.listdir(os.path.join(lfw_dir, p)) if f.lower().endswith(('.jpg', '.jpeg'))]) >= 2]

random.seed(42)
shuffled = list(people_ge2)
random.shuffle(shuffled)
n_cal = len(shuffled) // 2

split_data = {
    "random_seed": 42,
    "dataset": "Labeled Faces in the Wild (LFW)",
    "lfw_root": lfw_dir,
    "total_identities_ge2": len(people_ge2),
    "calibration_identities": shuffled[:n_cal],
    "test_identities": shuffled[n_cal:]
}

out_path = "runtime-check/split_manifest.json"
with open(out_path, "w") as f:
    json.dump(split_data, f, indent=2)

print(f"Saved {out_path}: {len(split_data['calibration_identities'])} calibration, {len(split_data['test_identities'])} test")
