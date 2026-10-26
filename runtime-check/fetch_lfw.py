#!/usr/bin/env python3
"""
Fetch LFW dataset for runtime verification
Requires: scikit-learn, numpy, PIL
"""
import numpy as np
from sklearn.datasets import fetch_lfw_people
import json
import os
import random

# Set random seed
random.seed(42)
np.random.seed(42)

print("Fetching LFW dataset...")
print("This may take several minutes on first download...")

try:
    # Fetch LFW with color=True, at least 2 photos per person
    lfw = fetch_lfw_people(
        color=True,
        slice_=None,
        resize=1.0,
        min_faces_per_person=2,
        download_if_missing=True
    )
    
    print(f"Dataset loaded: {lfw.target_names.shape[0]} people")
    print(f"Total images: {lfw.images.shape[0]}")
    print(f"Image shape: {lfw.images.shape[1:]}")
    
    # Count images per person
    person_counts = {}
    for target in lfw.target:
        person = lfw.target_names[target]
        person_counts[person] = person_counts.get(person, 0) + 1
    
    # Filter to people with at least 2 images
    people_with_2_plus = [p for p, c in person_counts.items() if c >= 2]
    print(f"People with >=2 images: {len(people_with_2_plus)}")
    
    # Select 30 class identities (random)
    if len(people_with_2_plus) >= 30:
        class_identities = random.sample(people_with_2_plus, 30)
    else:
        print(f"WARNING: Only {len(people_with_2_plus)} people have >=2 images. Using all of them.")
        class_identities = people_with_2_plus
    
    # Select 30 outsider identities (people NOT in class_identities)
    all_people = list(person_counts.keys())
    available_outsiders = [p for p in all_people if p not in class_identities]
    if len(available_outsiders) >= 30:
        outsider_identities = random.sample(available_outsiders, 30)
    else:
        print(f"WARNING: Only {len(available_outsiders)} available outsiders. Using all of them.")
        outsider_identities = available_outsiders
    
    # Build manifest with image indices
    manifest = {
        "class_identities": [],
        "outsider_identities": [],
        "total_people": len(lfw.target_names),
        "total_images": int(lfw.images.shape[0])
    }
    
    # Map people to their image indices
    person_to_indices = {}
    for idx, target in enumerate(lfw.target):
        person = lfw.target_names[target]
        if person not in person_to_indices:
            person_to_indices[person] = []
        person_to_indices[person].append(idx)
    
    # Add class identities with 2+ image indices
    for person in class_identities:
        indices = person_to_indices[person][:2]  # Take first 2
        manifest["class_identities"].append({
            "name": person,
            "enroll_image_index": int(indices[0]),
            "test_image_index": int(indices[1])
        })
    
    # Add outsider identities
    for person in outsider_identities:
        indices = person_to_indices[person]
        manifest["outsider_identities"].append({
            "name": person,
            "test_image_index": int(indices[0]) if indices else None
        })
    
    # Save manifest
    os.makedirs("runtime-check", exist_ok=True)
    with open("runtime-check/dataset_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\nManifest saved to runtime-check/dataset_manifest.json")
    print(f"Class identities: {len(manifest['class_identities'])}")
    print(f"Outsider identities: {len(manifest['outsider_identities'])}")
    
    # Save sample images for testing (first 3 class people)
    from PIL import Image
    os.makedirs("runtime-check/test_images", exist_ok=True)
    
    for i, class_person in enumerate(manifest["class_identities"][:3]):
        enroll_idx = class_person["enroll_image_index"]
        img = lfw.images[enroll_idx]
        pil_img = Image.fromarray((img * 255).astype(np.uint8))
        pil_img.save(f"runtime-check/test_images/RTC_{i+1:02d}_enroll.jpg")
        print(f"Saved test image: RTC_{i+1:02d}_enroll.jpg for {class_person['name']}")
    
    print("\nTask 2.0: LFW dataset fetch - COMPLETED")
    
except Exception as e:
    print(f"ERROR: Failed to fetch LFW dataset: {e}")
    print("Possible causes: No internet access, scikit-learn not installed, or download blocked")
    print("Marking Tasks 2 and 4 as NOT VERIFIED")
