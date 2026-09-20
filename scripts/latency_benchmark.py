#!/usr/bin/env python3
"""
P0.6 Recognition Latency Benchmark
------------------------------------
Measures end-to-end face recognition latency from the FastAPI service
for a simulated 30-person classroom. Runs two passes:
  1. EDGE_CROP_ENABLED=false  (full-frame encoding)
  2. EDGE_CROP_ENABLED=true   (per-face crop encoding)

Usage (with services running):
    python scripts/latency_benchmark.py [--api http://127.0.0.1:8000] [--photo path/to/photo.jpg] [--students N]

Results are appended to docs/demo-readiness-log.md automatically.
"""

import argparse
import json
import os
import statistics
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_API = os.getenv("FACE_API", "http://127.0.0.1:8000")


# ─── helpers ──────────────────────────────────────────────────────────────────

def build_dummy_students(n: int) -> list[dict]:
    """Generate N fake 128-d unit embeddings that will all fail to match (UNKNOWN).
    We want to benchmark throughput/latency, not accuracy."""
    import random
    import math
    random.seed(42)
    students = []
    for i in range(n):
        vec = [random.gauss(0, 1) for _ in range(128)]
        norm = math.sqrt(sum(v * v for v in vec))
        unit = [v / norm for v in vec]
        students.append({"student_id": i + 1, "roll_number": f"S{i + 1:04d}", "embedding": unit, "embeddings": []})
    return students


def ping(api: str) -> bool:
    try:
        r = requests.get(f"{api}/health", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def recognize_once(api: str, photo_bytes: bytes, photo_name: str, students: list, edge_crop: bool, threshold: float = 0.6) -> dict:
    """Call /recognize and return the response dict + measured latency."""
    t0 = time.perf_counter()
    r = requests.post(
        f"{api}/recognize",
        files={"image": (photo_name, photo_bytes, "image/jpeg")},
        data={
            "enrolled_students": json.dumps(students),
            "distance_threshold": str(threshold),
            "edge_crop": "true" if edge_crop else "false",
        },
        timeout=300,
    )
    elapsed = time.perf_counter() - t0
    r.raise_for_status()
    result = r.json()
    result["_latency_s"] = round(elapsed, 3)
    return result


def run_pass(api: str, photo_bytes: bytes, photo_name: str, students: list, edge_crop: bool, runs: int = 3) -> list[dict]:
    results = []
    label = "edge-crop=TRUE " if edge_crop else "edge-crop=FALSE"
    print(f"\n── {label}  ({runs} runs) ──")
    for i in range(runs):
        r = recognize_once(api, photo_bytes, photo_name, students, edge_crop)
        latency_ms = round(r["_latency_s"] * 1000)
        face_count = r.get("face_count", "?")
        quality_passed = r.get("quality", {}).get("quality_passed", "?")
        print(f"  run {i + 1}: {latency_ms} ms  faces={face_count}  quality_passed={quality_passed}")
        results.append({"latency_ms": latency_ms, "face_count": face_count, "quality_passed": quality_passed, "edge_crop": edge_crop})
    return results


def summarize(results: list[dict]) -> dict:
    latencies = [r["latency_ms"] for r in results]
    return {
        "runs": len(latencies),
        "min_ms": min(latencies),
        "max_ms": max(latencies),
        "mean_ms": round(statistics.mean(latencies)),
        "median_ms": round(statistics.median(latencies)),
        "face_count": results[0]["face_count"] if results else "?",
        "edge_crop": results[0]["edge_crop"] if results else None,
    }


def append_to_log(report: str):
    log_path = ROOT / "docs" / "demo-readiness-log.md"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(report)
    print(f"\nResults appended to {log_path}")


# ─── main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ClassSight recognition latency benchmark")
    parser.add_argument("--api", default=DEFAULT_API, help="FastAPI base URL")
    parser.add_argument(
        "--photo",
        default=str(ROOT / "face-service-fastapi/tests/fixtures/obama_biden_group_2010.jpg"),
        help="Group photo to use for benchmark",
    )
    parser.add_argument("--students", type=int, default=30, help="Number of enrolled students to simulate")
    parser.add_argument("--runs", type=int, default=3, help="Repetitions per mode")
    args = parser.parse_args()

    photo_path = Path(args.photo)
    if not photo_path.exists():
        print(f"ERROR: Photo not found: {photo_path}", file=sys.stderr)
        sys.exit(1)

    print(f"\nClassSight P0.6 — Recognition Latency Benchmark")
    print(f"  API:      {args.api}")
    print(f"  Photo:    {photo_path.name}  ({photo_path.stat().st_size / 1024:.1f} KB)")
    print(f"  Students: {args.students} simulated enrollments")
    print(f"  Runs:     {args.runs} per mode")

    if not ping(args.api):
        print(f"\nERROR: Cannot reach face service at {args.api}/health", file=sys.stderr)
        print("Make sure the face-service-fastapi is running (e.g. docker compose up face-service-fastapi).")
        sys.exit(1)

    photo_bytes = photo_path.read_bytes()
    students = build_dummy_students(args.students)

    # Warmup
    print("\nWarmup run (excluded from stats)…")
    try:
        recognize_once(args.api, photo_bytes, photo_path.name, students[:5], edge_crop=False)
    except Exception as e:
        print(f"Warmup failed: {e}")

    full_frame_results = run_pass(args.api, photo_bytes, photo_path.name, students, edge_crop=False, runs=args.runs)
    edge_crop_results  = run_pass(args.api, photo_bytes, photo_path.name, students, edge_crop=True,  runs=args.runs)

    full = summarize(full_frame_results)
    edge = summarize(edge_crop_results)

    face_count = full.get("face_count", "?")

    print(f"\n{'─'*60}")
    print(f"SUMMARY  (photo: {photo_path.name}, N_students={args.students})")
    print(f"{'─'*60}")
    print(f"  Full-frame:  median={full['median_ms']}ms  min={full['min_ms']}ms  max={full['max_ms']}ms")
    print(f"  Edge-crop:   median={edge['median_ms']}ms  min={edge['min_ms']}ms  max={edge['max_ms']}ms")
    delta = edge["median_ms"] - full["median_ms"]
    direction = "SLOWER" if delta > 0 else "FASTER"
    print(f"  Edge-crop vs Full-frame:  {abs(delta)}ms {direction}")
    print(f"  Detected faces in photo: {face_count}")
    print(f"{'─'*60}")

    # Recommendation
    print("\nDEMO RECOMMENDATION:")
    if full["median_ms"] < 4000:
        print(f"  Full-frame at {full['median_ms']}ms median — acceptable for demo (< 4s threshold).")
        rec_mode = "full-frame (EDGE_CROP_ENABLED=false)"
    elif edge["median_ms"] < 4000:
        print(f"  Full-frame too slow ({full['median_ms']}ms). Use edge-crop ({edge['median_ms']}ms) instead.")
        rec_mode = "edge-crop (EDGE_CROP_ENABLED=true)"
    else:
        print(f"  Both modes slow. Recommend pre-warming the model and using a smaller photo (< 2 MP).")
        rec_mode = "edge-crop (EDGE_CROP_ENABLED=true) + pre-warm"
    print(f"  Recommended: SET EDGE_CROP_ENABLED={'true' if 'edge-crop' in rec_mode else 'false'}\n")

    # Append to log
    import datetime
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    report = f"""
### P0.6 Latency Benchmark — {now}

| Mode | Runs | Faces Detected | Median (ms) | Min (ms) | Max (ms) |
|---|---|---|---|---|---|
| Full-frame | {full['runs']} | {face_count} | {full['median_ms']} | {full['min_ms']} | {full['max_ms']} |
| Edge-crop  | {edge['runs']} | {face_count} | {edge['median_ms']} | {edge['min_ms']} | {edge['max_ms']} |

**Photo:** `{photo_path.name}` · **Simulated enrolled:** {args.students}  
**Recommendation:** {rec_mode}

"""
    append_to_log(report)


if __name__ == "__main__":
    main()
