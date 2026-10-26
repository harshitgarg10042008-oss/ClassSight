#!/usr/bin/env python3
"""
calibrate.py: Real service path threshold calibration & 1:N roster simulation.
Usage:
    python runtime-check/calibrate.py --detector haar|yunet|mtcnn --split calibration|test [--sweep] [--t_auto <float>] [--m <float>] [--t_review <float>]
"""

import argparse
import csv
import io
import json
import math
import os
import random
import sys
import time
import requests
import numpy as np

random.seed(42)
np.random.seed(42)

FACE_SERVICE = "http://localhost:8000"
LFW_ROOT = r"C:\Users\vishe\scikit_learn_data\lfw_home\lfw_funneled"
SPLIT_MANIFEST_PATH = "runtime-check/split_manifest.json"


def wilson_ci(k, n, z=1.95996):
    if n <= 0:
        return 0.0, 0.0, 0.0
    p = float(k) / float(n)
    denom = 1.0 + (z ** 2) / n
    center = (p + (z ** 2) / (2.0 * n)) / denom
    margin = (z / denom) * math.sqrt((p * (1.0 - p) / n) + ((z ** 2) / (4.0 * (n ** 2))))
    return p, max(0.0, center - margin), min(1.0, center + margin)


def load_split_manifest():
    if not os.path.exists(SPLIT_MANIFEST_PATH):
        raise FileNotFoundError(f"Split manifest {SPLIT_MANIFEST_PATH} not found.")
    with open(SPLIT_MANIFEST_PATH, "r") as f:
        return json.load(f)


def get_cache_path(detector):
    return f"runtime-check/emb_cache_{detector}.npz"


def load_or_build_embeddings(detector, split_name, manifest, max_identities=100):
    cache_path = get_cache_path(detector)
    key_prefix = f"{split_name}_"
    cached_data = {}
    
    if os.path.exists(cache_path):
        try:
            with np.load(cache_path, allow_pickle=True) as data:
                for k in data.files:
                    cached_data[k] = data[k]
        except Exception as e:
            print(f"Warning: could not read cache {cache_path}: {e}")

    # Check if split is already fully cached
    meta_key = f"{key_prefix}identities"
    if meta_key in cached_data:
        print(f"Loaded {split_name} embeddings from cache: {cache_path}")
        identities = list(cached_data[meta_key])
        emb_dict = {}
        for p in identities:
            emb_dict[p] = cached_data[f"{key_prefix}{p}"]
        return emb_dict

    print(f"Building embeddings for split '{split_name}' using detector '{detector}' via {FACE_SERVICE}/enroll...")
    target_identities = manifest[f"{split_name}_identities"]
    
    # We take candidates deterministically
    emb_dict = {}
    total_images = 0

    for p in target_identities:
        p_dir = os.path.join(LFW_ROOT, p)
        if not os.path.isdir(p_dir):
            continue
        imgs = sorted([f for f in os.listdir(p_dir) if f.lower().endswith(('.jpg', '.jpeg'))])
        if len(imgs) < 2:
            continue
        
        valid_embs = []
        for img_name in imgs:
            img_path = os.path.join(p_dir, img_name)
            try:
                with open(img_path, "rb") as f:
                    resp = requests.post(
                        f"{FACE_SERVICE}/enroll",
                        files={"image": (img_name, f, "image/jpeg")},
                        timeout=10
                    )
                    if resp.status_code == 200:
                        emb = np.array(resp.json()["embedding"], dtype=np.float32)
                        valid_embs.append(emb)
                        if len(valid_embs) >= 4:  # up to 4 images per identity
                            break
            except Exception as e:
                pass
        
        if len(valid_embs) >= 2:
            emb_dict[p] = np.array(valid_embs)
            total_images += len(valid_embs)
            if len(emb_dict) >= max_identities:
                break

    print(f"Split '{split_name}': {len(emb_dict)} identities with >=2 embeddings ({total_images} total images).")

    # Update cache
    new_cache = dict(cached_data)
    new_cache[meta_key] = np.array(list(emb_dict.keys()))
    for p, embs in emb_dict.items():
        new_cache[f"{key_prefix}{p}"] = embs

    np.savez(cache_path, **new_cache)
    print(f"Updated cache: {cache_path}")
    return emb_dict


def compute_pair_statistics(emb_dict, seed=42):
    random.seed(seed)
    np.random.seed(seed)
    identities = list(emb_dict.keys())

    # Genuine pairs: within identity, capped at 10 pairs per identity
    genuine_distances = []
    distinct_genuine_pairs = 0
    for p in identities:
        embs = emb_dict[p]
        n_img = len(embs)
        pairs_for_p = []
        for i in range(n_img):
            for j in range(i + 1, n_img):
                d = np.sum(np.abs(embs[i] - embs[j]))
                pairs_for_p.append(float(d))
        if len(pairs_for_p) > 10:
            random.shuffle(pairs_for_p)
            pairs_for_p = pairs_for_p[:10]
        genuine_distances.extend(pairs_for_p)
        distinct_genuine_pairs += len(pairs_for_p)

    genuine_distances = np.array(genuine_distances, dtype=np.float64)

    # Impostor pairs: sample 2500 pairs between different identities
    impostor_distances = []
    n_impostors = 2500
    for _ in range(n_impostors):
        p1, p2 = random.sample(identities, 2)
        idx1 = random.randint(0, len(emb_dict[p1]) - 1)
        idx2 = random.randint(0, len(emb_dict[p2]) - 1)
        d = np.sum(np.abs(emb_dict[p1][idx1] - emb_dict[p2][idx2]))
        impostor_distances.append(float(d))

    impostor_distances = np.array(impostor_distances, dtype=np.float64)

    # Compute percentiles
    gen_stats = {
        "count": len(genuine_distances),
        "mean": float(np.mean(genuine_distances)),
        "std": float(np.std(genuine_distances)),
        "min": float(np.min(genuine_distances)),
        "p01": float(np.percentile(genuine_distances, 1)),
        "p05": float(np.percentile(genuine_distances, 5)),
        "p50": float(np.percentile(genuine_distances, 50)),
        "p95": float(np.percentile(genuine_distances, 95)),
        "p99": float(np.percentile(genuine_distances, 99)),
        "max": float(np.max(genuine_distances)),
    }

    imp_stats = {
        "count": len(impostor_distances),
        "mean": float(np.mean(impostor_distances)),
        "std": float(np.std(impostor_distances)),
        "min": float(np.min(impostor_distances)),
        "p01": float(np.percentile(impostor_distances, 1)),
        "p05": float(np.percentile(impostor_distances, 5)),
        "p50": float(np.percentile(impostor_distances, 50)),
        "p95": float(np.percentile(impostor_distances, 95)),
        "p99": float(np.percentile(impostor_distances, 99)),
        "max": float(np.max(impostor_distances)),
    }

    # EER calculation
    thresholds = np.linspace(4.0, 16.0, 1201)
    far_list = [float(np.mean(impostor_distances < t)) for t in thresholds]
    frr_list = [float(np.mean(genuine_distances >= t)) for t in thresholds]
    diff = np.abs(np.array(far_list) - np.array(frr_list))
    eer_idx = np.argmin(diff)
    eer_thresh = float(thresholds[eer_idx])
    eer_val = float((far_list[eer_idx] + frr_list[eer_idx]) / 2.0)

    # Threshold at FAR = 1%
    t_far_1pct = float(np.percentile(impostor_distances, 1.0))
    tar_at_1pct = float(np.mean(genuine_distances < t_far_1pct))

    # Threshold at FAR = 0.1%
    t_far_01pct = float(np.percentile(impostor_distances, 0.1))
    tar_at_01pct = float(np.mean(genuine_distances < t_far_01pct))

    # Stats at 15.0
    far_at_15 = float(np.mean(impostor_distances < 15.0))
    tar_at_15 = float(np.mean(genuine_distances < 15.0))

    return {
        "genuine": gen_stats,
        "impostor": imp_stats,
        "eer_threshold": eer_thresh,
        "eer": eer_val,
        "t_far_1pct": t_far_1pct,
        "tar_at_1pct": tar_at_1pct,
        "t_far_01pct": t_far_01pct,
        "tar_at_01pct": tar_at_01pct,
        "far_at_15": far_at_15,
        "tar_at_15": tar_at_15,
    }


def run_roster_simulation(emb_dict, n_rosters=200, seed=42):
    """
    Roster simulation: 200 random rosters of 30 identities from the split half.
    Enrol photo 1 (index 0), probe photo 2 (index 1).
    Probed with 30 outsider identities from the same half who were never enrolled.
    Returns list of probe records:
      - is_outsider: bool
      - true_identity: str
      - d1: float
      - d2: float
      - rank1_correct: bool (only for class probes)
      - assigned_identity: str
    """
    random.seed(seed)
    np.random.seed(seed)
    identities = sorted(list(emb_dict.keys()))
    if len(identities) < 60:
        raise ValueError(f"Need at least 60 identities for 30 class + 30 outsiders, got {len(identities)}")

    records = []

    for r_idx in range(n_rosters):
        sampled = random.sample(identities, 60)
        enrolled_ids = sampled[:30]
        outsider_ids = sampled[30:]

        # Enrolled embeddings: photo 1
        E = np.array([emb_dict[p][0] for p in enrolled_ids], dtype=np.float64)  # (30, 128)

        # 30 class probes: photo 2
        for p in enrolled_ids:
            probe_emb = emb_dict[p][1]  # (128,)
            dists = np.sum(np.abs(E - probe_emb), axis=1)  # (30,)
            sorted_indices = np.argsort(dists)
            best_idx = sorted_indices[0]
            second_idx = sorted_indices[1]
            d1 = float(dists[best_idx])
            d2 = float(dists[second_idx])
            assigned_id = enrolled_ids[best_idx]
            records.append({
                "roster_idx": r_idx,
                "is_outsider": False,
                "probe_id": p,
                "d1": d1,
                "d2": d2,
                "rank1_correct": (assigned_id == p),
                "assigned_id": assigned_id,
            })

        # 30 outsider probes: photo 1 or 2
        for p in outsider_ids:
            probe_emb = emb_dict[p][1]  # photo 2
            dists = np.sum(np.abs(E - probe_emb), axis=1)  # (30,)
            sorted_indices = np.argsort(dists)
            best_idx = sorted_indices[0]
            second_idx = sorted_indices[1]
            d1 = float(dists[best_idx])
            d2 = float(dists[second_idx])
            assigned_id = enrolled_ids[best_idx]
            records.append({
                "roster_idx": r_idx,
                "is_outsider": True,
                "probe_id": p,
                "d1": d1,
                "d2": d2,
                "rank1_correct": False,
                "assigned_id": assigned_id,
            })

    return records


def evaluate_tiers(records, t_auto, m, t_review):
    """
    Tiers logic:
      UNKNOWN if d1 > t_review
      REVIEW if (t_auto < d1 <= t_review) or ((d2 - d1) < m)
      AUTO if (d1 <= t_auto) and ((d2 - d1) >= m)
    """
    class_auto = 0
    class_review = 0
    class_unknown = 0
    class_wrong_auto = 0
    class_total = 0

    outsider_auto = 0
    outsider_review = 0
    outsider_unknown = 0
    outsider_total = 0

    # Per-identity probe tracking for Wilson CI
    distinct_class_probes = set()
    distinct_outsider_probes = set()
    probe_auto_counts = {}
    probe_total_counts = {}

    for rec in records:
        d1 = rec["d1"]
        d2 = rec["d2"]
        pid = rec["probe_id"]

        if d1 > t_review:
            tier = "UNKNOWN"
        elif (d1 > t_auto) or ((d2 - d1) < m):
            tier = "REVIEW"
        else:
            tier = "AUTO"

        probe_total_counts[pid] = probe_total_counts.get(pid, 0) + 1
        if tier == "AUTO":
            probe_auto_counts[pid] = probe_auto_counts.get(pid, 0) + 1

        if rec["is_outsider"]:
            distinct_outsider_probes.add(pid)
            outsider_total += 1
            if tier == "AUTO":
                outsider_auto += 1
            elif tier == "REVIEW":
                outsider_review += 1
            else:
                outsider_unknown += 1
        else:
            distinct_class_probes.add(pid)
            class_total += 1
            if tier == "AUTO":
                class_auto += 1
                if not rec["rank1_correct"]:
                    class_wrong_auto += 1
            elif tier == "REVIEW":
                class_review += 1
            else:
                class_unknown += 1

    return {
        "class_total": class_total,
        "class_auto": class_auto,
        "class_review": class_review,
        "class_unknown": class_unknown,
        "class_wrong_auto": class_wrong_auto,
        "class_auto_rate": class_auto / class_total if class_total else 0.0,
        "class_review_rate": class_review / class_total if class_total else 0.0,
        "class_unknown_rate": class_unknown / class_total if class_total else 0.0,
        "class_wrong_auto_rate": class_wrong_auto / class_total if class_total else 0.0,
        "outsider_total": outsider_total,
        "outsider_auto": outsider_auto,
        "outsider_review": outsider_review,
        "outsider_unknown": outsider_unknown,
        "outsider_auto_rate": outsider_auto / outsider_total if outsider_total else 0.0,
        "outsider_review_rate": outsider_review / outsider_total if outsider_total else 0.0,
        "outsider_unknown_rate": outsider_unknown / outsider_total if outsider_total else 0.0,
        "distinct_class_n": len(distinct_class_probes),
        "distinct_outsider_n": len(distinct_outsider_probes),
    }


def run_sweep(records, t_review, detector_name):
    t_auto_values = np.round(np.arange(5.0, 10.01, 0.25), 2)
    m_values = [0.0, 0.25, 0.5, 1.0, 1.5]

    results = []
    best_candidate = None
    best_class_auto = -1.0

    out_csv = f"runtime-check/sweep_{detector_name}.csv"
    with open(out_csv, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "t_auto", "m", "t_review",
            "class_auto_pct", "class_review_pct", "class_unknown_pct", "class_wrong_auto_pct",
            "outsider_auto_pct", "outsider_review_pct", "outsider_unknown_pct", "admissible"
        ])

        for t_auto in t_auto_values:
            for m in m_values:
                metrics = evaluate_tiers(records, t_auto, m, t_review)
                c_auto_pct = round(metrics["class_auto_rate"] * 100, 2)
                c_rev_pct = round(metrics["class_review_rate"] * 100, 2)
                c_unk_pct = round(metrics["class_unknown_rate"] * 100, 2)
                c_wrong_pct = round(metrics["class_wrong_auto_rate"] * 100, 2)
                o_auto_pct = round(metrics["outsider_auto_rate"] * 100, 2)
                o_rev_pct = round(metrics["outsider_review_rate"] * 100, 2)
                o_unk_pct = round(metrics["outsider_unknown_rate"] * 100, 2)

                # Rule: outsider probes in AUTO <= 1% and wrong-identity AUTO = 0 (or <= 0.1% if 0 unreachable)
                is_admissible = (o_auto_pct <= 1.0) and (c_wrong_pct == 0.0)

                writer.writerow([
                    t_auto, m, round(t_review, 4),
                    c_auto_pct, c_rev_pct, c_unk_pct, c_wrong_pct,
                    o_auto_pct, o_rev_pct, o_unk_pct, is_admissible
                ])

                results.append((t_auto, m, is_admissible, c_auto_pct, o_auto_pct, c_wrong_pct, metrics))

    # Choose candidate
    admissible_list = [r for r in results if r[2]]
    if not admissible_list:
        print("Warning: No candidate met wrong_identity AUTO == 0. Trying <= 0.1%...")
        admissible_list = [r for r in results if r[4] <= 1.0 and r[5] <= 0.1]

    admissible_list.sort(key=lambda x: (x[3], -x[4], -x[1]), reverse=True)
    best = admissible_list[0]
    print(f"\nSweep completed. Saved: {out_csv}")
    print(f"Selected parameters: T_auto={best[0]}, M={best[1]}, T_review={round(t_review, 4)}")
    print(f"  Class in AUTO: {best[3]}% | Outsider in AUTO: {best[4]}% | Class wrong in AUTO: {best[5]}%")
    return best[0], best[1], t_review


def main():
    parser = argparse.ArgumentParser(description="Calibrate face recognition thresholds.")
    parser.add_argument("--detector", required=True, choices=["haar", "yunet", "mtcnn"], help="Face detector name")
    parser.add_argument("--split", required=True, choices=["calibration", "test"], help="Dataset split to evaluate")
    parser.add_argument("--sweep", action="store_true", help="Perform grid sweep (calibration only)")
    parser.add_argument("--t_auto", type=float, default=None, help="T_auto override")
    parser.add_argument("--m", type=float, default=None, help="M override")
    parser.add_argument("--t_review", type=float, default=None, help="T_review override")
    args = parser.parse_args()

    manifest = load_split_manifest()
    emb_dict = load_or_build_embeddings(args.detector, args.split, manifest)

    print("\n--- 1. Pair Statistics (Simulated on LFW, NOT classroom accuracy) ---")
    pair_stats = compute_pair_statistics(emb_dict)
    gen = pair_stats["genuine"]
    imp = pair_stats["impostor"]

    print(f"Genuine pairs: n={gen['count']}, mean={gen['mean']:.2f}, std={gen['std']:.2f}, min={gen['min']:.2f}, p05={gen['p05']:.2f}, p50={gen['p50']:.2f}, p95={gen['p95']:.2f}, p99={gen['p99']:.2f}, max={gen['max']:.2f}")
    print(f"Impostor pairs: n={imp['count']}, mean={imp['mean']:.2f}, std={imp['std']:.2f}, min={imp['min']:.2f}, p01={imp['p01']:.2f}, p05={imp['p05']:.2f}, p50={imp['p50']:.2f}, p95={imp['p95']:.2f}, max={imp['max']:.2f}")
    print(f"EER: {pair_stats['eer']*100:.2f}% at threshold {pair_stats['eer_threshold']:.2f}")
    print(f"FAR=1% threshold (T_review): {pair_stats['t_far_1pct']:.4f} (TAR: {pair_stats['tar_at_1pct']*100:.2f}%)")
    print(f"FAR=0.1% threshold: {pair_stats['t_far_01pct']:.4f} (TAR: {pair_stats['tar_at_01pct']*100:.2f}%)")
    print(f"Threshold 15.0: FAR={pair_stats['far_at_15']*100:.2f}%, TAR={pair_stats['tar_at_15']*100:.2f}%")

    t_review = args.t_review if args.t_review is not None else pair_stats["t_far_1pct"]

    print("\n--- 2. 1:N 30-Student Roster Simulation (200 Rosters) ---")
    roster_records = run_roster_simulation(emb_dict, n_rosters=200)
    print(f"Generated {len(roster_records)} probe evaluations (30 class + 30 outsiders per roster).")

    if args.sweep:
        if args.split != "calibration":
            print("Warning: Sweeps should be performed on CALIBRATION data only.")
        best_t_auto, best_m, best_t_review = run_sweep(roster_records, t_review, args.detector)
        return

    # Evaluation with specified or default thresholds
    t_auto = args.t_auto if args.t_auto is not None else 7.5
    m = args.m if args.m is not None else 0.5

    print(f"\n--- 3. Evaluating Tiers: T_auto={t_auto}, M={m}, T_review={t_review:.4f} ---")
    metrics = evaluate_tiers(roster_records, t_auto, m, t_review)

    # Compute Wilson 95% CIs
    n_class_distinct = metrics["distinct_class_n"]
    n_out_distinct = metrics["distinct_outsider_n"]

    p_c_auto, c_auto_lo, c_auto_hi = wilson_ci(round(metrics["class_auto_rate"] * n_class_distinct), n_class_distinct)
    p_c_rev, c_rev_lo, c_rev_hi = wilson_ci(round(metrics["class_review_rate"] * n_class_distinct), n_class_distinct)
    p_c_unk, c_unk_lo, c_unk_hi = wilson_ci(round(metrics["class_unknown_rate"] * n_class_distinct), n_class_distinct)

    p_o_auto, o_auto_lo, o_auto_hi = wilson_ci(round(metrics["outsider_auto_rate"] * n_out_distinct), n_out_distinct)
    p_o_rev, o_rev_lo, o_rev_hi = wilson_ci(round(metrics["outsider_review_rate"] * n_out_distinct), n_out_distinct)
    p_o_unk, o_unk_lo, o_unk_hi = wilson_ci(round(metrics["outsider_unknown_rate"] * n_out_distinct), n_out_distinct)

    label_split = f"{args.split.upper()} {'(used to choose)' if args.split == 'calibration' else '(final test evaluation)'}"
    print(f"Results for [{label_split}] (Simulated on LFW, NOT classroom accuracy):")
    print(f"Class Probes (n={n_class_distinct} distinct probe identities):")
    print(f"  AUTO:    {p_c_auto*100:.2f}% (95% CI: [{c_auto_lo*100:.2f}%, {c_auto_hi*100:.2f}%])")
    print(f"  REVIEW:  {p_c_rev*100:.2f}% (95% CI: [{c_rev_lo*100:.2f}%, {c_rev_hi*100:.2f}%])")
    print(f"  UNKNOWN: {p_c_unk*100:.2f}% (95% CI: [{c_unk_lo*100:.2f}%, {c_unk_hi*100:.2f}%])")
    print(f"  Wrong-identity in AUTO: {metrics['class_wrong_auto_rate']*100:.2f}% ({metrics['class_wrong_auto']}/{metrics['class_total']})")

    print(f"Outsider Probes (n={n_out_distinct} distinct outsider identities):")
    print(f"  AUTO:    {p_o_auto*100:.2f}% (95% CI: [{o_auto_lo*100:.2f}%, {o_auto_hi*100:.2f}%])")
    print(f"  REVIEW:  {p_o_rev*100:.2f}% (95% CI: [{o_rev_lo*100:.2f}%, {o_rev_hi*100:.2f}%])")
    print(f"  UNKNOWN: {p_o_unk*100:.2f}% (95% CI: [{o_unk_lo*100:.2f}%, {o_unk_hi*100:.2f}%])")


if __name__ == "__main__":
    main()
