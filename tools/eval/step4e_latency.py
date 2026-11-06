#!/usr/bin/env python3
"""
Step 4e: Latency benchmark
- Recognition endpoint POST http://localhost:8000/recognize
- Time vs number of faces: 1, 5, 10, 20, 30
- 5 repeats each
- Reports: median and p95 in ms
- CPU model/cores and whether torch runs on CPU
Label: "simulated on LFW, NOT classroom accuracy"
"""
import io
import json
import os
import platform
import multiprocessing
import sys
import time
import requests
import numpy as np
from PIL import Image

FACE_SERVICE = "http://localhost:8000"

# CPU and environment info
cpu_info = {
    "platform": platform.platform(),
    "processor": platform.processor(),
    "cpu_cores": multiprocessing.cpu_count(),
    "torch_device": "cpu",
    "torch_cuda": False
}

with open("runtime-check/dataset_manifest.json") as f:
    manifest = json.load(f)

class_people = manifest["class_identities"]

def single_face_bytes(path):
    with open(path, "rb") as f:
        image_bytes = f.read()

    detect = requests.post(
        f"{FACE_SERVICE}/detect-faces",
        files={"image": (os.path.basename(path), image_bytes, "image/jpeg")},
        timeout=30,
    )
    detect.raise_for_status()
    detection = detect.json()
    faces = detection.get("faces", [])
    if not faces:
        raise RuntimeError(f"No face detected in benchmark image: {path}")

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    face = max(
        faces,
        key=lambda item: max(0, item["box"][2] - item["box"][0])
        * max(0, item["box"][3] - item["box"][1]),
    )
    top, right, bottom, left = face["box"]
    width, height = right - left, bottom - top
    pad_x, pad_y = int(width * 0.15), int(height * 0.15)
    left = max(0, left - pad_x)
    top = max(0, top - pad_y)
    right = min(image.width, right + pad_x)
    bottom = min(image.height, bottom + pad_y)

    cropped = io.BytesIO()
    image.crop((left, top, right, bottom)).save(cropped, format="JPEG", quality=95)
    return cropped.getvalue()

# Fetch enrolled students payload for 30 students
# Query from face service directly or create mock payload with enrolled embeddings
student_payload = []
for i, person in enumerate(class_people):
    enrollment_bytes = single_face_bytes(person["enroll_path"])
    res = requests.post(
        f"{FACE_SERVICE}/enroll",
        files={"image": ("enrollment.jpg", enrollment_bytes, "image/jpeg")},
        timeout=30,
    )
    if res.status_code != 200:
        raise RuntimeError(
            f"Enrollment failed for {person['name']}: "
            f"HTTP {res.status_code} {res.text[:300]}"
        )
    emb = res.json()["embedding"]
    student_payload.append({
        "student_id": i + 1,
        "roll_number": f"RTC_STU_{i+1:02d}",
        "embeddings": [emb]
    })

enrolled_json = json.dumps(student_payload)
print(f"Created enrolled payload for {len(student_payload)} students")

def build_composite_with_n_faces(n_faces):
    # Place n_faces on a 1920x1080 canvas at 140px width
    bg = Image.new("RGB", (1920, 1080), color=(220, 222, 225))
    cols = 6
    rows = 5
    cell_w = 1920 // cols
    cell_h = 1080 // rows
    
    for i in range(n_faces):
        p = class_people[i % len(class_people)]
        img = Image.open(p["test_path"])
        aspect = img.size[1] / img.size[0]
        target_w = 140
        target_h = int(target_w * aspect)
        img_resized = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        r = i // cols
        c = i % cols
        xc = c * cell_w + cell_w // 2
        yc = r * cell_h + cell_h // 2
        
        px = xc - target_w // 2
        py = yc - target_h // 2
        bg.paste(img_resized, (px, py))
        
    buf = io.BytesIO()
    bg.save(buf, format="JPEG", quality=90)
    return buf.getvalue()

face_counts = [1, 5, 10, 20, 30]
repeats = 5
latency_results = {}

print("\nWarming up endpoint...")
test_buf = build_composite_with_n_faces(1)
requests.post(f"{FACE_SERVICE}/recognize", data={"enrolled_students": enrolled_json, "distance_threshold": "15.0"}, files={"image": ("test.jpg", test_buf, "image/jpeg")})

print("\nStarting Latency Benchmark across face counts [1, 5, 10, 20, 30] x 5 repeats...")

for n in face_counts:
    img_bytes = build_composite_with_n_faces(n)
    times = []
    service_timings = []
    
    for r in range(repeats):
        t0 = time.perf_counter()
        res = requests.post(
            f"{FACE_SERVICE}/recognize",
            data={"enrolled_students": enrolled_json, "distance_threshold": "15.0"},
            files={"image": (f"faces_{n}_{r}.jpg", img_bytes, "image/jpeg")},
            timeout=30
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        times.append(elapsed_ms)
        if res.status_code == 200:
            t_obj = res.json().get("timings", {})
            service_timings.append(t_obj)
        else:
            print(f"Error {res.status_code}: {res.text}")
            
    median_ms = round(float(np.median(times)), 2)
    p95_ms = round(float(np.percentile(times, 95)), 2)
    min_ms = round(float(np.min(times)), 2)
    max_ms = round(float(np.max(times)), 2)
    
    latency_results[str(n)] = {
        "face_count": n,
        "repeats": repeats,
        "times_ms": [round(t, 2) for t in times],
        "median_ms": median_ms,
        "p95_ms": p95_ms,
        "min_ms": min_ms,
        "max_ms": max_ms,
        "service_timings": service_timings[-1] if service_timings else {}
    }
    print(f"  Faces: {n:2d} -> Median: {median_ms:6.2f} ms | p95: {p95_ms:6.2f} ms (min: {min_ms:.1f}, max: {max_ms:.1f})")

output = {
    "disclaimer": "simulated on LFW, NOT classroom accuracy",
    "method": "FastAPI POST /recognize endpoint latency measured over 5 repeats per face count (1, 5, 10, 20, 30 faces on 1920x1080 canvas) with 30 enrolled students",
    "cpu_info": cpu_info,
    "latency_by_face_count": latency_results
}

os.makedirs("runtime-check", exist_ok=True)
with open("runtime-check/step4e_results.json", "w") as f:
    json.dump(output, f, indent=2)

print("\n" + "=" * 60)
print("STEP 4e SUMMARY TABLE (simulated on LFW, NOT classroom accuracy)")
print("=" * 60)
print(f"CPU: {cpu_info['processor']} ({cpu_info['cpu_cores']} cores)")
print(f"PyTorch Execution Device: {cpu_info['torch_device'].upper()}")
print("| Face Count | Repeats | Median (ms) | p95 (ms) | Min (ms) | Max (ms) |")
print("|------------|---------|-------------|----------|----------|----------|")
for n in face_counts:
    item = latency_results[str(n)]
    print(f"| {n:10d} | {item['repeats']:7d} | {item['median_ms']:11.2f} | {item['p95_ms']:8.2f} | {item['min_ms']:8.2f} | {item['max_ms']:8.2f} |")
