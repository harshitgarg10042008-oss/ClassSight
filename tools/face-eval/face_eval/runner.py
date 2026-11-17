"""face_eval/runner.py

Main evaluation runner for ClassSight face-eval harness.
Orchestrates dataset loading, recognizer execution, threshold calibration,
metric calculation, and report generation.
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any, Sequence

import cv2
import numpy as np
import pandas as pd

from face_eval.adapters.loader import load_recognizer
from face_eval.calibration import calibrate
from face_eval import degradations
from face_eval import metrics

logger = logging.getLogger("face_eval.runner")


def _read_rgb(path: Path | str) -> np.ndarray:
    bgr = cv2.imread(str(path))
    if bgr is None:
        raise FileNotFoundError(f"Could not load image: {path}")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def run_evaluation(
    config: dict[str, Any],
    output_dir: str | Path,
    seed: int = 42,
    recognizer_filter: Sequence[str] | None = None,
    dataset_filter: Sequence[str] | None = None,
    phase_filter: Sequence[str] | None = None,
) -> dict[str, Any]:
    """Execute evaluation pipeline and write results to output_dir."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    summary: dict[str, Any] = {
        "seed": seed,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "recognizers": {},
        "calibration": {},
        "latency": {},
    }
    condition_records: list[dict[str, Any]] = []

    # Filter recognizers
    rec_configs = config.get("recognizers", [])
    if recognizer_filter:
        filter_set = {r.strip().upper() for r in recognizer_filter}
        rec_configs = [r for r in rec_configs if r.get("id", "").strip().upper() in filter_set]

    # Datasets setup
    datasets_cfg = config.get("datasets", {})
    lfw_ds = None
    if dataset_filter is None or "lfw" in dataset_filter:
        lfw_cfg = datasets_cfg.get("lfw", {})
        if lfw_cfg.get("enabled", True):
            try:
                from face_eval.datasets.lfw_dataset import LFWDataset
                lfw_ds = LFWDataset(
                    path=lfw_cfg.get("path", "eval_data/lfw"),
                    calibration_fraction=config.get("calibration_fraction", 0.3),
                    seed=seed,
                )
                print(f"[face_eval] Loaded LFW dataset with {len(lfw_ds)} images.")
            except Exception as exc:
                print(f"[face_eval] NOTICE: Could not load LFW dataset: {exc}")

    # Check for real dataset
    if dataset_filter is None or "real" in dataset_filter:
        real_cfg = datasets_cfg.get("real", {})
        if real_cfg.get("enabled", True):
            try:
                from face_eval.datasets.real_dataset import RealDataset
                real_ds = RealDataset(
                    path=real_cfg.get("path", "eval_data/real"),
                    min_people=real_cfg.get("min_people", 10),
                    min_sessions=real_cfg.get("min_sessions", 2),
                )
                print(f"[face_eval] Loaded Real consented dataset with {len(real_ds)} images.")
            except ValueError as exc:
                print(f"[face_eval] Real dataset check: {exc} (skipping real data)")

    # Run recognizers
    for r_entry in rec_configs:
        rec_id = r_entry.get("id")
        rec_name = r_entry.get("name")
        print(f"\n[face_eval] Processing Recognizer {rec_id} ({rec_name})...")

        adapter = load_recognizer(r_entry)
        if adapter is None:
            print(f"[face_eval] Skipping {rec_id} (not available or disabled).")
            continue

        # 1. Latency benchmark (stub face crop)
        sample_crop = np.full((160, 160, 3), 128, dtype=np.uint8)
        # warmup
        try:
            adapter.embed(sample_crop)
            latencies = []
            for _ in range(10):
                t0 = time.perf_counter()
                adapter.embed(sample_crop)
                latencies.append((time.perf_counter() - t0) * 1000.0)
            lat_stats = metrics.latency_stats(latencies)
            summary["latency"][rec_id] = lat_stats
        except Exception as exc:
            print(f"[face_eval] Latency benchmark error for {rec_id}: {exc}")

        # 2. Calibration
        calib_res = {}
        if lfw_ds is not None and (phase_filter is None or "calibrate" in phase_filter or "all" in phase_filter):
            cal_pairs, cal_labels = lfw_ds.get_pairs(split="calibration", max_pairs_per_id=3)
            fallback = config.get("thresholds", {})
            calib_res = calibrate(
                adapter,
                pairs=cal_pairs,
                labels=cal_labels,
                far_target=0.01,
                split_seed=seed,
                fallback_thresholds=fallback,
            )
            summary["calibration"][rec_id] = calib_res
            print(f"[face_eval] Calibrated thresholds for {rec_id}: {calib_res}")

        # 3. Evaluation on test split
        if lfw_ds is not None and (phase_filter is None or "evaluate" in phase_filter or "all" in phase_filter):
            test_pairs, test_labels = lfw_ds.get_pairs(split="test", max_pairs_per_id=5)
            if test_pairs:
                dists = []
                valid_lbls = []
                img_cache: dict[str, np.ndarray] = {}

                for (p1, p2), lbl in zip(test_pairs, test_labels):
                    try:
                        s1, s2 = str(p1), str(p2)
                        if s1 not in img_cache:
                            img_cache[s1] = adapter.embed(_read_rgb(p1))
                        if s2 not in img_cache:
                            img_cache[s2] = adapter.embed(_read_rgb(p2))

                        d = adapter.distance(img_cache[s1], img_cache[s2])
                        dists.append(d)
                        valid_lbls.append(lbl)
                    except Exception:
                        continue

                if dists:
                    scores = -np.asarray(dists, dtype=float)
                    labels_arr = np.asarray(valid_lbls, dtype=int)

                    eer_res = metrics.eer(scores, labels_arr)
                    tar_res = metrics.tar_at_far(scores, labels_arr, far_targets=[1e-2, 1e-3])

                    # Tier distribution under production thresholds
                    thrs = config.get("thresholds", {})
                    t_auto = thrs.get("T_auto", 8.0)
                    t_rev = thrs.get("T_review", 9.74)
                    m_val = thrs.get("M", 0.5)

                    tier_res = metrics.tier_distribution(dists, t_auto, t_rev, m_val)

                    # Bootstrap CI for EER
                    ci_lower, ci_upper = metrics.bootstrap_ci(
                        lambda s, l: metrics.eer(s, l)["eer"],
                        scores,
                        labels_arr,
                        n_boot=200,
                        seed=seed,
                    )

                    rec_eval = {
                        "eer": eer_res["eer"],
                        "eer_ci_95": [ci_lower, ci_upper],
                        "tar_at_far_1pct": tar_res.get(0.01, {}).get("tar"),
                        "tar_at_far_01pct": tar_res.get(0.001, {}).get("tar"),
                        "tier_distribution": tier_res,
                        "n_test_pairs": len(dists),
                        "licence_note": adapter.licence_note,
                    }
                    summary["recognizers"][rec_id] = rec_eval
                    print(f"[face_eval] Results for {rec_id}: EER={eer_res['eer']:.4f}, 95% CI=[{ci_lower:.4f}, {ci_upper:.4f}]")

                    # Record baseline condition record
                    condition_records.append({
                        "recognizer": rec_id,
                        "condition": "normal (unmodified LFW)",
                        "mean_distance": float(np.mean(dists)),
                        "eer": float(eer_res["eer"]),
                    })

                    # 4. Degradation evaluation on a sample of probe images
                    sample_img_paths = list(img_cache.keys())[:5]
                    deg_funcs = {
                        "downscale_upscale": degradations.downscale_upscale,
                        "gaussian_blur": degradations.gaussian_blur,
                        "motion_blur": degradations.motion_blur,
                        "low_brightness": degradations.low_brightness,
                        "high_brightness": degradations.high_brightness,
                        "jpeg_compression": degradations.jpeg_compression,
                        "perspective_warp": degradations.perspective_warp,
                        "lower_face_occlusion": degradations.lower_face_occlusion,
                        "lower_face_occlusion_beard_proxy": degradations.lower_face_occlusion_beard_proxy,
                    }

                    for deg_name, deg_fn in deg_funcs.items():
                        deg_dists = []
                        for p_str in sample_img_paths:
                            try:
                                raw_img = _read_rgb(p_str)
                                deg_img = deg_fn(raw_img)
                                deg_emb = adapter.embed(deg_img)
                                orig_emb = img_cache[p_str]
                                deg_dists.append(adapter.distance(orig_emb, deg_emb))
                            except Exception:
                                continue
                        if deg_dists:
                            condition_records.append({
                                "recognizer": rec_id,
                                "condition": deg_name,
                                "mean_distance": float(np.mean(deg_dists)),
                                "eer": float("nan"),
                            })

    # Save output files
    summary_path = output_path / "summary.json"
    with summary_path.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    calib_path = output_path / "calibration.json"
    with calib_path.open("w", encoding="utf-8") as f:
        json.dump(summary["calibration"], f, indent=2)

    latency_path = output_path / "latency.json"
    with latency_path.open("w", encoding="utf-8") as f:
        json.dump(summary["latency"], f, indent=2)

    if condition_records:
        cond_df = pd.DataFrame(condition_records)
        cond_df.to_csv(output_path / "per_condition.csv", index=False)

    # Write FINAL_RECOGNITION_EVAL.md
    report_path = output_path / "FINAL_RECOGNITION_EVAL.md"
    _write_report(report_path, summary, condition_records)

    print(f"\n[face_eval] Evaluation completed successfully. Results saved to: {output_path.resolve()}")
    return summary


def _write_report(report_path: Path, summary: dict[str, Any], condition_records: list[dict[str, Any]]) -> None:
    lines = [
        "# ClassSight Face Recognition Benchmark Report",
        "",
        f"- **Date / Time**: {summary.get('timestamp')}",
        f"- **Random Seed**: {summary.get('seed')}",
        "",
        "## Recognizer Summary",
        "",
        "| Recognizer | EER | 95% Bootstrap CI | TAR @ FAR=1% | TAR @ FAR=0.1% | Auto Tier % | Licence Note |",
        "|---|---|---|---|---|---|---|",
    ]

    for rec_id, res in summary.get("recognizers", {}).items():
        ci = res.get("eer_ci_95", [0.0, 0.0])
        tier = res.get("tier_distribution", {})
        auto_pct = f"{tier.get('auto', 0.0) * 100:.1f}%"
        lines.append(
            f"| {rec_id} | {res.get('eer', 0.0):.4f} | [{ci[0]:.4f}, {ci[1]:.4f}] | "
            f"{res.get('tar_at_far_1pct', 0.0):.4f} | {res.get('tar_at_far_01pct', 0.0):.4f} | "
            f"{auto_pct} | {res.get('licence_note', 'N/A')} |"
        )

    lines.extend([
        "",
        "## Calibrated Thresholds",
        "",
        "| Recognizer | T_auto | T_review | M | Status |",
        "|---|---|---|---|---|",
    ])
    for rec_id, cal in summary.get("calibration", {}).items():
        lines.append(f"| {rec_id} | {cal.get('T_auto')} | {cal.get('T_review')} | {cal.get('M')} | {cal.get('status')} |")

    lines.extend([
        "",
        "## Per-Condition Sensitivity & Synthetic Degradations",
        "",
        "> ⚠️ **CAUTION**: 'lower_face_occlusion_beard_proxy' is a synthetic lower-face occlusion proxy — NOT a real beard test.",
        "",
        "| Recognizer | Condition | Mean Distance to Pristine |",
        "|---|---|---|",
    ])
    for row in condition_records:
        lines.append(f"| {row.get('recognizer')} | {row.get('condition')} | {row.get('mean_distance', 0.0):.4f} |")

    lines.append("")
    with report_path.open("w", encoding="utf-8") as f:
        f.write("\n".join(lines))
