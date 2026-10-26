import os
import json
import random

random.seed(42)

lfw_dir = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"
people = sorted([d for d in os.listdir(lfw_dir) if os.path.isdir(os.path.join(lfw_dir, d))])

people_with_2 = []
people_with_1 = []

for p in people:
    p_dir = os.path.join(lfw_dir, p)
    imgs = sorted([f for f in os.listdir(p_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    if len(imgs) >= 2:
        people_with_2.append((p, imgs))
    elif len(imgs) >= 1:
        people_with_1.append((p, imgs))

# Select 30 class identities from people_with_2
random.seed(42)
class_sample = random.sample(people_with_2, 30)
class_names = set(p for p, _ in class_sample)

# Outsider identities should be people NOT in class
available_outsiders = [item for item in people_with_2 if item[0] not in class_names] + people_with_1
outsider_sample = random.sample(available_outsiders, 30)

manifest = {
    "random_seed": 42,
    "dataset": "Labeled Faces in the Wild (LFW)",
    "lfw_root": lfw_dir,
    "class_identities": [],
    "outsider_identities": []
}

for i, (p, imgs) in enumerate(class_sample):
    enroll_img = os.path.join(p, imgs[0])
    test_img = os.path.join(p, imgs[1])
    manifest["class_identities"].append({
        "id": i + 1,
        "name": p,
        "enroll_image": enroll_img,
        "test_image": test_img,
        "enroll_path": os.path.join(lfw_dir, enroll_img),
        "test_path": os.path.join(lfw_dir, test_img)
    })

for i, (p, imgs) in enumerate(outsider_sample):
    test_img = os.path.join(p, imgs[0])
    manifest["outsider_identities"].append({
        "id": i + 1,
        "name": p,
        "test_image": test_img,
        "test_path": os.path.join(lfw_dir, test_img)
    })

manifest_path = "runtime-check/dataset_manifest.json"
with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2)

print(f"Manifest written to {manifest_path}")
print(f"Class identities: {len(manifest['class_identities'])}")
print(f"Outsider identities: {len(manifest['outsider_identities'])}")
print("Sample class 0:", manifest["class_identities"][0]["name"])
print("Sample outsider 0:", manifest["outsider_identities"][0]["name"])
