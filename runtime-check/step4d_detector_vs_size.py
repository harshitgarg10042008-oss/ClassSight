#!/usr/bin/env python3
"""
Step 4d: Detector vs face size
- Single faces on 1920x1080 neutral background at face widths:
  40 px, 60 px, 80 px, 120 px, 160 px
- 100 faces per size (100 distinct LFW faces)
- Tested via running face-service POST /detect-faces with current Haar params:
  scaleFactor=1.2, minNeighbors=5, minSize=30
- Reports detection rate per size
Label: "simulated on LFW, NOT classroom accuracy"
"""
import io
import json
import os
import random
import sys
import time
import requests
from PIL import Image

FACE_SERVICE = "http://localhost:8000"
LFW_DIR = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"

# Select 100 distinct faces from LFW
people = sorted([d for d in os.listdir(LFW_DIR) if os.path.isdir(os.path.join(LFW_DIR, d))])
random.seed(42)
selected_people = random.sample(people, 100)

face_images = []
for p in selected_people:
    p_dir = os.path.join(LFW_DIR, p)
    imgs = sorted([f for f in os.listdir(p_dir) if f.lower().endswith(('.jpg', '.jpeg'))])
    if imgs:
        face_images.append(os.path.join(p_dir, imgs[0]))

print(f"Loaded {len(face_images)} distinct LFW face images for size benchmark")

target_widths = [40, 60, 80, 120, 160]
results_by_size = {}

for width in target_widths:
    print(f"\nTesting width {width}px across 100 faces...")
    detected_count = 0
    detected_widths = []
    latencies = []
    
    for i, img_path in enumerate(face_images):
        face_img = Image.open(img_path)
        aspect = face_img.size[1] / face_img.size[0]
        target_h = int(width * aspect)
        face_resized = face_img.resize((width, target_h), Image.Resampling.LANCZOS)
        
        # Place at center of 1920x1080 neutral canvas
        canvas = Image.new("RGB", (1920, 1080), color=(220, 222, 225))
        px = (1920 - width) // 2
        py = (1080 - target_h) // 2
        canvas.paste(face_resized, (px, py))
        
        buf = io.BytesIO()
        canvas.save(buf, format="JPEG", quality=90)
        
        t0 = time.perf_counter()
        res = requests.post(f"{FACE_SERVICE}/detect-faces", files={"image": (f"face_{width}_{i}.jpg", buf.getvalue(), "image/jpeg")}, timeout=10)
        lat = (time.perf_counter() - t0) * 1000
        latencies.append(lat)
        
        if res.status_code == 200:
            data = res.json()
            faces = data.get("faces", [])
            if len(faces) > 0:
                detected_count += 1
                # Box in dlib convention: [top, right, bottom, left]
                box = faces[0]["box"]
                detected_w = box[1] - box[3]
                detected_widths.append(detected_w)
                
    det_rate = round(detected_count / len(face_images) * 100, 2)
    avg_det_w = round(float(np_mean := sum(detected_widths) / len(detected_widths)), 1) if detected_widths else 0
    avg_lat = round(sum(latencies) / len(latencies), 1)
    
    results_by_size[str(width)] = {
        "target_width_px": width,
        "sample_size": len(face_images),
        "detected_count": detected_count,
        "detection_rate_pct": det_rate,
        "avg_detected_box_width_px": avg_det_w,
        "avg_latency_ms": avg_lat
    }
    print(f"  Width {width}px: {detected_count}/100 detected ({det_rate}%), avg detected width = {avg_det_w}px, avg time = {avg_lat}ms")

output = {
    "disclaimer": "simulated on LFW, NOT classroom accuracy",
    "method": "100 distinct LFW faces resized to widths [40, 60, 80, 120, 160] px centered on 1920x1080 neutral background (RGB 220,222,225), tested via POST /detect-faces (Haar Cascade scaleFactor=1.2, minNeighbors=5, minSize=30)",
    "results": results_by_size
}

os.makedirs("runtime-check", exist_ok=True)
with open("runtime-check/step4d_results.json", "w") as f:
    json.dump(output, f, indent=2)

print("\n" + "=" * 60)
print("STEP 4d SUMMARY TABLE (simulated on LFW, NOT classroom accuracy)")
print("=" * 60)
print("| Target Face Width | Sample Size | Detected | Detection Rate (%) | Avg Detected Box Width |")
print("|-------------------|-------------|----------|--------------------|------------------------|")
for w in target_widths:
    item = results_by_size[str(w)]
    print(f"| {w} px | {item['sample_size']} | {item['detected_count']} | {item['detection_rate_pct']}% | {item['avg_detected_box_width_px']} px |")
