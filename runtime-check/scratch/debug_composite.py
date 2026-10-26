#!/usr/bin/env python3
"""Debug: test detection on a side-by-side composite of 3 LFW images."""
import io
import json
import requests
from PIL import Image

LFW_ROOT = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"
FACE_SERVICE = "http://localhost:8000"

# First check the Tom_Coverdale enrollment (single image, detect)
img1 = Image.open(fr"{LFW_ROOT}\Tom_Coverdale\Tom_Coverdale_0002.jpg").convert("RGB")
img2 = Image.open(fr"{LFW_ROOT}\Abid_Hamid_Mahmud_Al-Tikriti\Abid_Hamid_Mahmud_Al-Tikriti_0002.jpg").convert("RGB")
img3 = Image.open(fr"{LFW_ROOT}\Reggie_Miller\Reggie_Miller_0002.jpg").convert("RGB")

# Individual sizes
print(f"Tom size: {img1.size}")
print(f"Abid size: {img2.size}")
print(f"Reggie size: {img3.size}")

# Side-by-side composite
w = img1.size[0] + img2.size[0] + img3.size[0]
h = max(img1.size[1], img2.size[1], img3.size[1])
canvas = Image.new("RGB", (w, h))
canvas.paste(img1, (0, 0))
canvas.paste(img2, (img1.size[0], 0))
canvas.paste(img3, (img1.size[0] + img2.size[0], 0))
print(f"Composite size: {canvas.size}")

buf = io.BytesIO()
canvas.save(buf, format="JPEG", quality=95)
buf.seek(0)

# Detect in composite
resp = requests.post(f"{FACE_SERVICE}/detect-faces", files={"image": ("composite.jpg", buf.getvalue(), "image/jpeg")})
print(f"Detection status: {resp.status_code}")
data = resp.json()
print(f"Faces detected: {data['face_count']}")
for f in data.get('faces', []):
    print(f"  Face {f['face_index']}: box={f['box']}")

# Also test individual enrollment (detect + embed)
buf1 = io.BytesIO()
img1.save(buf1, format="JPEG", quality=95)
resp1 = requests.post(f"{FACE_SERVICE}/enroll", files={"image": ("enroll.jpg", buf1.getvalue(), "image/jpeg")})
print(f"\nEnrollment status for Tom: {resp1.status_code}")
if resp1.status_code == 200:
    d = resp1.json()
    print(f"  face_count={d['face_count']}, embedding[:5]={d['embedding'][:5]}")
else:
    print(f"  Error: {resp1.text}")
