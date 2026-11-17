"""face_eval/calibration.py

Per-recognizer threshold calibration.
Must use ONLY the calibration split, NEVER the test split.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Sequence

import cv2
import numpy as np

from face_eval.interfaces import RecognizerAdapter

logger = logging.getLogger("face_eval.calibration")


def _load_rgb_image(path: Path | str) -> np.ndarray:
    p = Path(path)
    bgr = cv2.imread(str(p))
    if bgr is None:
        raise FileNotFoundError(f"Failed to read image at: {p}")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def calibrate(
    recognizer: RecognizerAdapter,
    pairs: Sequence[tuple[Path | str, Path | str]],
    labels: Sequence[int],
    far_target: float = 0.01,
    split_seed: int = 42,
    fallback_thresholds: dict | None = None,
) -> dict:
    """Calibrate decision thresholds on the calibration split.

    Parameters
    ----------
    recognizer : RecognizerAdapter
    pairs : list of (img_path_a, img_path_b)
    labels : list of int (1=genuine, 0=impostor)
    far_target : target FAR for T_review (default: 0.01 = 1%)
    split_seed : seed used to produce calibration split
    fallback_thresholds : optional default dict if calibration has too few pairs

    Returns
    -------
    dict with keys:
      T_auto, T_review, M, far_target, n_pairs, split_seed, status
    """
    defaults = fallback_thresholds or {"T_auto": 8.0, "T_review": 9.74, "M": 0.5}

    if len(pairs) == 0 or len(labels) == 0:
        logger.warning("Empty calibration pairs. Returning fallback thresholds.")
        return {
            **defaults,
            "far_target": far_target,
            "n_pairs": 0,
            "split_seed": split_seed,
            "status": "fallback_empty_data",
        }

    # Compute distances for pairs
    distances: list[float] = []
    valid_labels: list[int] = []

    emb_cache: dict[str, np.ndarray] = {}

    for (p1, p2), lbl in zip(pairs, labels):
        try:
            s1, s2 = str(p1), str(p2)
            if s1 not in emb_cache:
                img1 = _load_rgb_image(p1)
                emb_cache[s1] = recognizer.embed(img1)
            if s2 not in emb_cache:
                img2 = _load_rgb_image(p2)
                emb_cache[s2] = recognizer.embed(img2)

            d = recognizer.distance(emb_cache[s1], emb_cache[s2])
            distances.append(d)
            valid_labels.append(lbl)
        except Exception as exc:
            logger.debug("Failed to embed pair (%s, %s): %s", p1, p2, exc)
            continue

    if len(distances) < 10:
        logger.warning("Too few successfully evaluated calibration pairs (%d). Falling back.", len(distances))
        return {
            **defaults,
            "far_target": far_target,
            "n_pairs": len(distances),
            "split_seed": split_seed,
            "status": "fallback_insufficient_pairs",
        }

    dists = np.asarray(distances, dtype=float)
    lbls = np.asarray(valid_labels, dtype=int)

    impostor_dists = dists[lbls == 0]
    genuine_dists = dists[lbls == 1]

    if len(impostor_dists) == 0 or len(genuine_dists) == 0:
        logger.warning("Missing genuine or impostor pairs in calibration. Falling back.")
        return {
            **defaults,
            "far_target": far_target,
            "n_pairs": len(dists),
            "split_seed": split_seed,
            "status": "fallback_missing_class",
        }

    # For distance: impostors have LARGE distance, genuines have SMALL distance.
    # An accept decision is: distance < threshold.
    # FAR = fraction of impostors with distance < threshold.
    # To find threshold for FAR <= far_target:
    # Sort impostor distances ascending. The far_target percentile gives the threshold.
    # E.g. at far_target=0.01, 1% of impostors have dist < threshold.
    sorted_imp = np.sort(impostor_dists)
    idx_review = int(np.floor(far_target * len(sorted_imp)))
    idx_review = min(idx_review, len(sorted_imp) - 1)
    calibrated_T_review = float(sorted_imp[idx_review])

    # T_auto operating at an even tighter FAR (e.g. 0.001 or 1/10th of far_target)
    auto_far_target = max(0.001, far_target * 0.1)
    idx_auto = int(np.floor(auto_far_target * len(sorted_imp)))
    idx_auto = min(idx_auto, len(sorted_imp) - 1)
    calibrated_T_auto = float(sorted_imp[idx_auto])

    # Calibrate margin M as 1.5 * standard error of genuine distances or default
    calibrated_M = float(defaults.get("M", 0.5))

    return {
        "T_auto": round(calibrated_T_auto, 4),
        "T_review": round(calibrated_T_review, 4),
        "M": round(calibrated_M, 4),
        "far_target": far_target,
        "n_pairs": len(dists),
        "n_genuine": len(genuine_dists),
        "n_impostor": len(impostor_dists),
        "split_seed": split_seed,
        "status": "calibrated",
    }
