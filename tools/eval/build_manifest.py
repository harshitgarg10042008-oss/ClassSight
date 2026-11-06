import os
import json
import random
import requests

random.seed(42)

lfw_dir = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"
people = sorted([d for d in os.listdir(lfw_dir) if os.path.isdir(os.path.join(lfw_dir, d))])
people_with_2 = [p for p in people if len([f for f in os.listdir(os.path.join(lfw_dir, p)) if f.lower().endswith(('.jpg', '.jpeg'))]) >= 2]

shuffled_2 = list(people_with_2)
random.shuffle(shuffled_2)

print("Filtering 30 class identities with verifiable single-face enroll & test photos...")
valid_class = []
for p in shuffled_2:
    imgs = sorted([f for f in os.listdir(os.path.join(lfw_dir, p)) if f.lower().endswith(('.jpg', '.jpeg'))])
    p1 = os.path.join(lfw_dir, p, imgs[0])
    p2 = os.path.join(lfw_dir, p, imgs[1])
    try:
        with open(p1, 'rb') as f1, open(p2, 'rb') as f2:
            r1 = requests.post('http://localhost:8000/enroll', files={'image': f1}, timeout=5)
            r2 = requests.post('http://localhost:8000/detect-faces', files={'image': f2}, timeout=5)
            if r1.status_code == 200 and r2.status_code == 200 and r2.json().get('face_count') == 1:
                valid_class.append((p, imgs[0], imgs[1]))
                if len(valid_class) == 30:
                    break
    except Exception as e:
        print(f"Error testing {p}: {e}")

class_set = set(p for p, _, _ in valid_class)
remaining = [p for p in people if p not in class_set]
random.shuffle(remaining)

print("Filtering 30 outsider identities with verifiable single-face probe photos...")
valid_outsiders = []
for p in remaining:
    imgs = sorted([f for f in os.listdir(os.path.join(lfw_dir, p)) if f.lower().endswith(('.jpg', '.jpeg'))])
    p1 = os.path.join(lfw_dir, p, imgs[0])
    try:
        with open(p1, 'rb') as f1:
            r1 = requests.post('http://localhost:8000/detect-faces', files={'image': f1}, timeout=5)
            if r1.status_code == 200 and r1.json().get('face_count') == 1:
                valid_outsiders.append((p, imgs[0]))
                if len(valid_outsiders) == 30:
                    break
    except Exception as e:
        print(f"Error testing outsider {p}: {e}")

manifest = {
    "random_seed": 42,
    "dataset": "Labeled Faces in the Wild (LFW)",
    "lfw_root": lfw_dir,
    "class_identities": [],
    "outsider_identities": []
}

for i, (p, enroll_img, test_img) in enumerate(valid_class):
    manifest["class_identities"].append({
        "id": i + 1,
        "name": p,
        "enroll_image": os.path.join(p, enroll_img),
        "test_image": os.path.join(p, test_img),
        "enroll_path": os.path.join(lfw_dir, p, enroll_img),
        "test_path": os.path.join(lfw_dir, p, test_img)
    })

for i, (p, test_img) in enumerate(valid_outsiders):
    manifest["outsider_identities"].append({
        "id": i + 1,
        "name": p,
        "test_image": os.path.join(p, test_img),
        "test_path": os.path.join(lfw_dir, p, test_img)
    })

manifest_path = "runtime-check/dataset_manifest.json"
with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2)

print(f"Manifest written to {manifest_path}")
print(f"Class identities verified: {len(manifest['class_identities'])}")
print(f"Outsider identities verified: {len(manifest['outsider_identities'])}")
