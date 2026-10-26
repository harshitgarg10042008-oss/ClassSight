#!/usr/bin/env python3
"""
bench_detect.py: Detector benchmarks across face sizes, composites, false positives, and latency.
Usage:
    python runtime-check/bench_detect.py --detector haar|yunet|mtcnn --split calibration|test
"""

import argparse
import io
import json
import os
import random
import sys
import time
import requests
import numpy as np
from PIL import Image, ImageEnhance, ImageDraw

random.seed(42)
np.random.seed(42)

FACE_SERVICE = "http://localhost:8000"
LFW_ROOT = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"
SPLIT_MANIFEST_PATH = "runtime-check/split_manifest.json"


def load_split_manifest():
    if not os.path.exists(SPLIT_MANIFEST_PATH):
        raise FileNotFoundError(f"Split manifest {SPLIT_MANIFEST_PATH} not found.")
    with open(SPLIT_MANIFEST_PATH, "r") as f:
        return json.load(f)


def get_split_images(split_name, manifest, n_needed=100):
    identities = manifest[f"{split_name}_identities"]
    images = []
    for p in identities:
        p_dir = os.path.join(LFW_ROOT, p)
        if not os.path.isdir(p_dir):
            continue
        imgs = sorted([f for f in os.listdir(p_dir) if f.lower().endswith(('.jpg', '.jpeg'))])
        if imgs:
            images.append(os.path.join(p_dir, imgs[0]))
            if len(images) >= n_needed:
                break
    return images


def run_benchmark_a(images, widths=[40, 60, 80, 120, 160]):
    print("\n--- Benchmark (a): Single Faces on 1920x1080 Canvas (100 faces per size) ---")
    results = {}
    for w in widths:
        detected = 0
        detected_widths = []
        for i, img_path in enumerate(images[:100]):
            img = Image.open(img_path).convert("RGB")
            aspect = img.size[1] / img.size[0]
            target_h = int(w * aspect)
            resized = img.resize((w, target_h), Image.Resampling.LANCZOS)

            canvas = Image.new("RGB", (1920, 1080), color=(220, 222, 225))
            px = (1920 - w) // 2
            py = (1080 - target_h) // 2
            canvas.paste(resized, (px, py))

            buf = io.BytesIO()
            canvas.save(buf, format="JPEG", quality=90)
            try:
                resp = requests.post(
                    f"{FACE_SERVICE}/detect-faces",
                    files={"image": (f"tile_{w}_{i}.jpg", buf.getvalue(), "image/jpeg")},
                    timeout=15
                )
                if resp.status_code == 200:
                    faces = resp.json().get("faces", [])
                    if len(faces) > 0:
                        detected += 1
                        box = faces[0]["box"]
                        # box is [top, right, bottom, left]
                        det_w = abs(box[1] - box[3])
                        detected_widths.append(det_w)
            except Exception as e:
                pass

        det_rate = (detected / 100.0) * 100.0
        avg_box_w = float(np.mean(detected_widths)) if detected_widths else 0.0
        results[w] = {
            "width_px": w,
            "detected_count": detected,
            "detection_rate_pct": round(det_rate, 2),
            "avg_detected_box_width_px": round(avg_box_w, 1),
        }
        print(f"  Width {w:3d} px: {detected:3d}/100 detected ({det_rate:5.1f}%), real detected box width: {avg_box_w:5.1f} px")

    # Mean detection rate over 60, 80, 120 px cases (used in decision rule)
    rates_60_80_120 = [results[w]["detection_rate_pct"] for w in [60, 80, 120] if w in results]
    mean_rate = float(np.mean(rates_60_80_120)) if rates_60_80_120 else 0.0
    print(f"  --> Mean detection rate over (60, 80, 120 px): {mean_rate:.2f}%")
    results["mean_rate_60_80_120"] = round(mean_rate, 2)
    return results


def run_benchmark_b(images):
    print("\n--- Benchmark (b): 30-Face Classroom Composites (1920x1080) ---")
    if len(images) < 30:
        raise ValueError(f"Need 30 images, got {len(images)}")
    class_images = images[:30]

    modes = [("fixed_50", 50), ("variable_70_110", None), ("fixed_140", 140)]
    results = {}

    for mode_name, size_val in modes:
        random.seed(42)
        canvas = Image.new("RGB", (1920, 1080), color=(220, 222, 225))
        cols, rows = 6, 5
        cell_w, cell_h = 1920 // cols, 1080 // rows

        for i, img_path in enumerate(class_images):
            c = i % cols
            r = i // cols
            xc = c * cell_w + cell_w // 2
            yc = r * cell_h + cell_h // 2

            img = Image.open(img_path).convert("RGB")
            if mode_name == "fixed_50":
                tw = 50
            elif mode_name == "fixed_140":
                tw = 140
            else:
                tw = random.randint(70, 110)

            th = int(tw * (img.size[1] / img.size[0]))
            resized = img.resize((tw, th), Image.Resampling.LANCZOS)
            if mode_name == "variable_70_110":
                angle = random.uniform(-8, 8)
                rotated = resized.rotate(angle, expand=True, resample=Image.Resampling.BILINEAR)
                jitter = ImageEnhance.Brightness(rotated).enhance(random.uniform(0.85, 1.15))
            else:
                jitter = resized

            px = xc - jitter.size[0] // 2
            py = yc - jitter.size[1] // 2
            canvas.paste(jitter, (px, py))

        buf = io.BytesIO()
        canvas.save(buf, format="JPEG", quality=90)

        resp = requests.post(
            f"{FACE_SERVICE}/detect-faces",
            files={"image": (f"composite_{mode_name}.jpg", buf.getvalue(), "image/jpeg")},
            timeout=15
        )
        detected_count = 0
        if resp.status_code == 200:
            detected_count = len(resp.json().get("faces", []))

        results[mode_name] = {
            "mode": mode_name,
            "detected_count": detected_count,
            "total_faces": 30,
            "rate_pct": round(detected_count / 30.0 * 100.0, 2),
        }
        print(f"  Composite {mode_name:17s}: {detected_count:2d}/30 detected ({results[mode_name]['rate_pct']}%)")

    return results


def run_benchmark_c(n_images=50):
    print(f"\n--- Benchmark (c): False Positives on {n_images} Face-Free 1920x1080 Images ---")
    random.seed(42)
    np.random.seed(42)
    total_false_positives = 0

    for i in range(n_images):
        # Generate various textures: neutral solids, gradients, grids, noise, stripes
        img_type = i % 5
        if img_type == 0:
            # solid neutral / wall color
            gray_val = random.randint(180, 240)
            img = Image.new("RGB", (1920, 1080), color=(gray_val, gray_val, gray_val))
        elif img_type == 1:
            # gradient
            arr = np.linspace(50, 220, 1920, dtype=np.uint8)
            arr = np.tile(arr, (1080, 1))
            img = Image.fromarray(np.stack([arr, arr, arr], axis=-1))
        elif img_type == 2:
            # grid / checkerboard (simulating tiles/desks)
            arr = np.zeros((1080, 1920), dtype=np.uint8)
            block = 60
            for r in range(0, 1080, block):
                for c in range(0, 1920, block):
                    if ((r // block) + (c // block)) % 2 == 0:
                        arr[r:r+block, c:c+block] = 200
                    else:
                        arr[r:r+block, c:c+block] = 120
            img = Image.fromarray(np.stack([arr, arr, arr], axis=-1))
        elif img_type == 3:
            # noise / textured background
            noise = np.random.randint(140, 200, (1080, 1920), dtype=np.uint8)
            img = Image.fromarray(np.stack([noise, noise, noise], axis=-1))
        else:
            # stripes / lines
            arr = np.zeros((1080, 1920, 3), dtype=np.uint8) + 210
            for y in range(0, 1080, 40):
                arr[y:y+5, :, :] = 90
            img = Image.fromarray(arr)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        try:
            resp = requests.post(
                f"{FACE_SERVICE}/detect-faces",
                files={"image": (f"face_free_{i}.jpg", buf.getvalue(), "image/jpeg")},
                timeout=15
            )
            if resp.status_code == 200:
                faces = resp.json().get("faces", [])
                total_false_positives += len(faces)
        except Exception:
            pass

    mean_fp = float(total_false_positives) / float(n_images)
    print(f"  Total false detections: {total_false_positives} across {n_images} images")
    print(f"  Mean false positives per face-free image: {mean_fp:.4f} (Rule requirement: <= 0.1)")
    return {"total_false_positives": total_false_positives, "n_images": n_images, "mean_false_positives": round(mean_fp, 4)}


def run_benchmark_d(images, n_trials=20):
    print(f"\n--- Benchmark (d): Detector Latency on 1920x1080 Image (median of {n_trials}) ---")
    # Build a standard 1920x1080 test image (composite)
    canvas = Image.new("RGB", (1920, 1080), color=(220, 222, 225))
    if images:
        for i, img_path in enumerate(images[:15]):
            img = Image.open(img_path).convert("RGB").resize((90, 110))
            canvas.paste(img, (100 + (i % 5) * 350, 100 + (i // 5) * 300))
    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=90)
    data = buf.getvalue()

    latencies = []
    for _ in range(n_trials):
        t0 = time.perf_counter()
        resp = requests.post(
            f"{FACE_SERVICE}/detect-faces",
            files={"image": ("timing_test.jpg", data, "image/jpeg")},
            timeout=15
        )
        lat = (time.perf_counter() - t0) * 1000
        if resp.status_code == 200:
            timings = resp.json().get("timings", {})
            det_ms = timings.get("detection_ms", lat)
            latencies.append(det_ms)

    median_lat = float(np.median(latencies))
    p95_lat = float(np.percentile(latencies, 95))
    print(f"  Detector time: median = {median_lat:.1f} ms, p95 = {p95_lat:.1f} ms (Rule requirement: <= 1500 ms)")
    return {"median_ms": round(median_lat, 1), "p95_ms": round(p95_lat, 1)}


def main():
    parser = argparse.ArgumentParser(description="Benchmark face detector.")
    parser.add_argument("--detector", required=True, choices=["haar", "yunet", "mtcnn"], help="Face detector name")
    parser.add_argument("--split", required=True, choices=["calibration", "test"], help="Dataset split")
    args = parser.parse_args()

    manifest = load_split_manifest()
    images = get_split_images(args.split, manifest, n_needed=120)

    print(f"=== Detection Benchmarks for Detector '{args.detector.upper()}' on {args.split.upper()} ===")
    res_a = run_benchmark_a(images)
    res_b = run_benchmark_b(images)
    res_c = run_benchmark_c()
    res_d = run_benchmark_d(images)

    results = {
        "detector": args.detector,
        "split": args.split,
        "benchmark_a": res_a,
        "benchmark_b": res_b,
        "benchmark_c": res_c,
        "benchmark_d": res_d,
    }
    out_path = f"runtime-check/bench_detect_{args.detector}_{args.split}.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nAll benchmark results saved to {out_path}")


if __name__ == "__main__":
    main()
