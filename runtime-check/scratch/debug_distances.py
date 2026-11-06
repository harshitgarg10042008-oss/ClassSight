#!/usr/bin/env python3
"""Check inter-image distances for the 3 enrolled test students."""
import io
import json
import numpy as np
import requests
from PIL import Image

LFW_ROOT = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"
FACE_SERVICE = "http://localhost:8000"

people = [
    ("Tom_Coverdale", "Tom_Coverdale_0001.jpg", "Tom_Coverdale_0002.jpg"),
    ("Abid_Hamid_Mahmud_Al-Tikriti", "Abid_Hamid_Mahmud_Al-Tikriti_0001.jpg", "Abid_Hamid_Mahmud_Al-Tikriti_0002.jpg"),
    ("Reggie_Miller", "Reggie_Miller_0001.jpg", "Reggie_Miller_0002.jpg"),
]

def get_emb(path):
    with open(path, "rb") as f:
        resp = requests.post(f"{FACE_SERVICE}/enroll", files={"image": ("img.jpg", f, "image/jpeg")})
    if resp.status_code == 200:
        return np.array(resp.json()["embedding"])
    else:
        print(f"  Error: {resp.status_code} {resp.text}")
        return None

for name, enroll_img, test_img in people:
    e1 = get_emb(fr"{LFW_ROOT}\{name}\{enroll_img}")
    e2 = get_emb(fr"{LFW_ROOT}\{name}\{test_img}")
    if e1 is not None and e2 is not None:
        d = np.sum(np.abs(e1 - e2))
        tier = "AUTO" if d <= 8.0 else "REVIEW" if d <= 9.74 else "UNKNOWN"
        print(f"{name}: L1={d:.3f} -> {tier}")
    else:
        print(f"{name}: FAILED to enroll")
