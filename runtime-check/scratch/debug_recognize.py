#!/usr/bin/env python3
"""Directly call /recognize with enrolled embeddings to see what comes back."""
import io
import json
import numpy as np
import requests
from PIL import Image

BACKEND = "http://localhost:8080"
FACE_SERVICE = "http://localhost:8000"
LFW_ROOT = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"

# Get enroll embeddings
def get_emb(path):
    with open(path, "rb") as f:
        resp = requests.post(f"{FACE_SERVICE}/enroll", files={"image": ("img.jpg", f, "image/jpeg")})
    if resp.status_code == 200:
        return resp.json()["embedding"]
    return None

people = [
    (39, "RTC_S2_STU_01", "Tom_Coverdale", "Tom_Coverdale_0001.jpg"),
    (40, "RTC_S2_STU_02", "Abid_Hamid_Mahmud_Al-Tikriti", "Abid_Hamid_Mahmud_Al-Tikriti_0001.jpg"),
    (41, "RTC_S2_STU_03", "Reggie_Miller", "Reggie_Miller_0001.jpg"),
]

enrolled = []
for sid, roll, name, img_name in people:
    emb = get_emb(fr"{LFW_ROOT}\{name}\{img_name}")
    if emb:
        enrolled.append({"student_id": sid, "roll_number": roll, "embedding": emb})
        print(f"Got embedding for {name}: first5={emb[:5]}")

# Build composite (test images)
imgs = []
for _, _, name, _ in people:
    test_name = name + "_0002.jpg"
    img = Image.open(fr"{LFW_ROOT}\{name}\{test_name}").convert("RGB")
    imgs.append(img)

w = sum(img.size[0] for img in imgs)
h = max(img.size[1] for img in imgs)
canvas = Image.new("RGB", (w, h))
x = 0
for img in imgs:
    canvas.paste(img, (x, 0))
    x += img.size[0]

buf = io.BytesIO()
canvas.save(buf, format="JPEG", quality=95)
img_bytes = buf.getvalue()

# Call /recognize directly
resp = requests.post(
    f"{FACE_SERVICE}/recognize",
    files={"image": ("group.jpg", img_bytes, "image/jpeg")},
    data={"enrolled_students": json.dumps(enrolled)}
)
print(f"\n/recognize status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    print(f"face_count: {data['face_count']}")
    for m in data['matches']:
        print(f"  face_idx={m['face_index']}: student={m['student_id']}, tier={m['tier']}, d={m.get('manhattan_distance')}, matched={m['matched']}")
else:
    print(f"Error: {resp.text}")
