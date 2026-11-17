"""face_eval/metrics.py

Pure metric functions for the ClassSight face-eval harness.

Conventions
-----------
* scores  — higher value == more similar  (use -distance if working with distances)
* labels  — 1 for genuine pair, 0 for impostor pair
* All functions are stateless and have no side-effects.
* No scikit-learn in core metrics; scipy used only for bootstrap sampling.
"""
from __future__ import annotations

from typing import Callable, Sequence

import numpy as np
import pandas as pd
from scipy import stats as _scipy_stats


# ---------------------------------------------------------------------------
# EER
# ---------------------------------------------------------------------------

def eer(scores: Sequence[float], labels: Sequence[int]) -> dict:
    """Equal Error Rate.

    Parameters
    ----------
    scores : array-like of float
        Similarity scores (higher == more similar).
    labels : array-like of int
        1 = genuine pair, 0 = impostor pair.

    Returns
    -------
    dict with keys:
        eer        : float — EER value in [0, 1]
        threshold  : float — decision threshold at which EER is achieved
    """
    scores = np.asarray(scores, dtype=float)
    labels = np.asarray(labels, dtype=int)

    thresholds = np.unique(scores)
    best_eer = 1.0
    best_thr = thresholds[0]

    genuine_scores  = scores[labels == 1]
    impostor_scores = scores[labels == 0]

    for thr in thresholds:
        # FAR: fraction of impostors accepted (score >= thr)
        far = np.mean(impostor_scores >= thr) if len(impostor_scores) > 0 else 0.0
        # FRR: fraction of genuines rejected (score < thr)
        frr = np.mean(genuine_scores < thr)   if len(genuine_scores)  > 0 else 0.0

        diff = abs(far - frr)
        if diff < abs(best_eer - ((far + frr) / 2.0)) or best_eer == 1.0:
            # pick the threshold that minimises |FAR - FRR|
            pass
        if diff < abs(best_eer * 2 - (far + frr)):
            best_eer = (far + frr) / 2.0
            best_thr = thr

    # More precise: interpolate crossing point
    fars, frrs = [], []
    for thr in thresholds:
        far = np.mean(impostor_scores >= thr) if len(impostor_scores) > 0 else 0.0
        frr = np.mean(genuine_scores < thr)   if len(genuine_scores)  > 0 else 0.0
        fars.append(far)
        frrs.append(frr)

    fars = np.array(fars)
    frrs = np.array(frrs)
    diffs = np.abs(fars - frrs)
    idx = np.argmin(diffs)
    best_eer = float((fars[idx] + frrs[idx]) / 2.0)
    best_thr = float(thresholds[idx])

    return {"eer": best_eer, "threshold": best_thr}


# ---------------------------------------------------------------------------
# TAR @ FAR
# ---------------------------------------------------------------------------

def tar_at_far(
    scores: Sequence[float],
    labels: Sequence[int],
    far_targets: Sequence[float] = (1e-2, 1e-3),
) -> dict:
    """True Accept Rate at given False Accept Rate operating points.

    Parameters
    ----------
    scores      : similarity scores (higher == more similar)
    labels      : 1=genuine, 0=impostor
    far_targets : FAR operating points to evaluate

    Returns
    -------
    dict mapping far_target (float) -> {"tar": float, "threshold": float}
    """
    scores = np.asarray(scores, dtype=float)
    labels = np.asarray(labels, dtype=int)

    genuine_scores  = scores[labels == 1]
    impostor_scores = scores[labels == 0]

    results = {}
    for far_target in far_targets:
        # Find threshold such that FAR <= far_target
        if len(impostor_scores) == 0:
            thr = -np.inf
        else:
            # Sort impostor scores descending; pick the threshold that admits at most far_target fraction
            sorted_imp = np.sort(impostor_scores)[::-1]
            n_allowed  = max(0, int(np.floor(far_target * len(impostor_scores))))
            thr = float(sorted_imp[n_allowed]) if n_allowed < len(sorted_imp) else float(sorted_imp[-1])

        tar = float(np.mean(genuine_scores >= thr)) if len(genuine_scores) > 0 else 0.0
        results[float(far_target)] = {"tar": tar, "threshold": thr}

    return results


# ---------------------------------------------------------------------------
# Bootstrap CI
# ---------------------------------------------------------------------------

def bootstrap_ci(
    metric_fn: Callable[[np.ndarray, np.ndarray], float],
    scores: Sequence[float],
    labels: Sequence[int],
    n_boot: int = 1000,
    ci: float = 0.95,
    seed: int = 42,
) -> tuple[float, float]:
    """Bootstrap confidence interval for a scalar metric.

    Parameters
    ----------
    metric_fn   : function(scores, labels) -> float
    scores      : similarity scores
    labels      : 1=genuine, 0=impostor
    n_boot      : number of bootstrap resamples
    ci          : confidence level, e.g. 0.95
    seed        : RNG seed for reproducibility

    Returns
    -------
    (lower, upper) confidence interval bounds
    """
    scores = np.asarray(scores, dtype=float)
    labels = np.asarray(labels, dtype=int)
    rng    = np.random.RandomState(seed)

    boot_metrics = []
    n = len(scores)
    for _ in range(n_boot):
        idx = rng.randint(0, n, size=n)
        try:
            val = metric_fn(scores[idx], labels[idx])
            if np.isfinite(val):
                boot_metrics.append(float(val))
        except Exception:
            continue

    if len(boot_metrics) == 0:
        return 0.0, 0.0

    boot_metrics = np.array(boot_metrics)
    alpha = (1.0 - ci) / 2.0
    lower = float(np.percentile(boot_metrics, 100 * alpha))
    upper = float(np.percentile(boot_metrics, 100 * (1.0 - alpha)))
    return lower, upper


# ---------------------------------------------------------------------------
# Rank-1 Accuracy (closed-set identification)
# ---------------------------------------------------------------------------

def rank1_accuracy(
    gallery_embeddings: np.ndarray,
    gallery_ids: Sequence[str],
    probe_embeddings: np.ndarray,
    probe_ids: Sequence[str],
    distance_fn: Callable[[np.ndarray, np.ndarray], float],
) -> float:
    """Rank-1 closed-set identification accuracy.

    Parameters
    ----------
    gallery_embeddings : (G, D) array
    gallery_ids        : length-G list of identity strings
    probe_embeddings   : (P, D) array
    probe_ids          : length-P list of identity strings
    distance_fn        : function(a, b) -> float (lower == more similar)

    Returns
    -------
    float — fraction of probes correctly matched at rank 1
    """
    gallery_embeddings = np.asarray(gallery_embeddings, dtype=float)
    probe_embeddings   = np.asarray(probe_embeddings, dtype=float)
    gallery_ids = list(gallery_ids)
    probe_ids   = list(probe_ids)

    correct = 0
    for p_emb, p_id in zip(probe_embeddings, probe_ids):
        dists = [distance_fn(p_emb, g_emb) for g_emb in gallery_embeddings]
        best  = gallery_ids[int(np.argmin(dists))]
        if best == p_id:
            correct += 1

    return correct / len(probe_ids) if probe_ids else 0.0


# ---------------------------------------------------------------------------
# Open-set FAR
# ---------------------------------------------------------------------------

def open_set_far(
    impostor_scores: Sequence[float],
    threshold: float,
) -> dict:
    """Open-set False Accept Rate for impostors.

    Parameters
    ----------
    impostor_scores : similarity scores for known-impostor pairs
    threshold       : acceptance threshold (score >= threshold => accepted)

    Returns
    -------
    dict with keys:
        far                   : float
        ci_lower, ci_upper    : Wilson CI bounds
        n_tested              : int
        upper_bound_statement : str  (plain English)
    """
    impostor_scores = np.asarray(impostor_scores, dtype=float)
    n = len(impostor_scores)
    k = int(np.sum(impostor_scores >= threshold))

    far = k / n if n > 0 else 0.0
    lower, upper = wilson_ci(k, n) if n > 0 else (0.0, 0.0)

    statement = (
        f"At threshold {threshold:.4f}, {k}/{n} impostors accepted. "
        f"95% Wilson CI: [{lower:.4f}, {upper:.4f}]. "
        f"Upper-bound FAR (95% CI): {upper:.4f}."
    )

    return {
        "far": far,
        "ci_lower": lower,
        "ci_upper": upper,
        "n_tested": n,
        "upper_bound_statement": statement,
    }


# ---------------------------------------------------------------------------
# Wilson CI
# ---------------------------------------------------------------------------

def wilson_ci(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """Wilson score confidence interval for a proportion.

    Parameters
    ----------
    k : number of successes
    n : total trials
    z : normal quantile (default 1.96 for 95% CI)

    Returns
    -------
    (lower, upper)
    """
    if n == 0:
        return 0.0, 0.0
    p_hat = k / n
    denom = 1 + z**2 / n
    centre = (p_hat + z**2 / (2 * n)) / denom
    spread = (z * np.sqrt(p_hat * (1 - p_hat) / n + z**2 / (4 * n**2))) / denom
    return float(max(0.0, centre - spread)), float(min(1.0, centre + spread))


# ---------------------------------------------------------------------------
# Tier Distribution
# ---------------------------------------------------------------------------

def tier_distribution(
    distances: Sequence[float],
    T_auto: float,
    T_review: float,
    M: float,
    second_best_distances: Sequence[float] | None = None,
) -> dict:
    """Compute fraction of comparisons in each tier.

    Tiers (using L1 distances, lower == more similar):
        AUTO    : distance < T_auto  AND (second_best - distance) > M  (or no second_best given)
        REVIEW  : T_auto <= distance < T_review
        UNKNOWN : distance >= T_review

    Parameters
    ----------
    distances             : primary (best-match) distances
    T_auto, T_review, M   : threshold values
    second_best_distances : if provided, AUTO requires margin check

    Returns
    -------
    dict with keys: auto, review, unknown, n_total (all fractions + count)
    """
    distances = np.asarray(distances, dtype=float)
    n = len(distances)

    if second_best_distances is not None:
        second_best = np.asarray(second_best_distances, dtype=float)
        margin_ok = (second_best - distances) > M
    else:
        margin_ok = np.ones(n, dtype=bool)

    auto    = np.sum((distances < T_auto)   & margin_ok)
    review  = np.sum((distances >= T_auto)  & (distances < T_review))
    unknown = np.sum(distances >= T_review)

    return {
        "auto":    int(auto)    / n if n > 0 else 0.0,
        "review":  int(review)  / n if n > 0 else 0.0,
        "unknown": int(unknown) / n if n > 0 else 0.0,
        "n_total": n,
        "n_auto":    int(auto),
        "n_review":  int(review),
        "n_unknown": int(unknown),
    }


# ---------------------------------------------------------------------------
# Wrong-identity in AUTO tier
# ---------------------------------------------------------------------------

def wrong_identity_in_auto(
    matches: Sequence[tuple[str, str]],
    ground_truth: Sequence[tuple[str, str]],
) -> int:
    """Count AUTO-tier decisions that matched the wrong identity.

    Parameters
    ----------
    matches      : list of (predicted_id, probe_id) for AUTO decisions
    ground_truth : list of (true_id, probe_id) for the same probes

    Returns
    -------
    int — number of wrong AUTO-tier matches
    """
    gt_map = {probe_id: true_id for true_id, probe_id in ground_truth}
    errors = 0
    for pred_id, probe_id in matches:
        true_id = gt_map.get(probe_id)
        if true_id is not None and pred_id != true_id:
            errors += 1
    return errors


# ---------------------------------------------------------------------------
# Per-condition breakdown
# ---------------------------------------------------------------------------

def per_condition_breakdown(
    results_df: "pd.DataFrame",
    condition_col: str,
    metric_cols: list[str],
) -> "pd.DataFrame":
    """Aggregate metric columns by condition.

    Parameters
    ----------
    results_df    : DataFrame with one row per comparison
    condition_col : column name holding condition label
    metric_cols   : columns to aggregate (mean)

    Returns
    -------
    pd.DataFrame indexed by condition
    """
    return results_df.groupby(condition_col)[metric_cols].mean()


# ---------------------------------------------------------------------------
# Latency stats
# ---------------------------------------------------------------------------

def latency_stats(times_ms: list[float]) -> dict:
    """Summarise latency measurements.

    Parameters
    ----------
    times_ms : list of per-image inference times in milliseconds

    Returns
    -------
    dict with keys: median_ms, p95_ms, mean_ms, std_ms, n, hardware_note
    """
    arr = np.asarray(times_ms, dtype=float)
    return {
        "median_ms":    float(np.median(arr)),
        "p95_ms":       float(np.percentile(arr, 95)),
        "mean_ms":      float(np.mean(arr)),
        "std_ms":       float(np.std(arr)),
        "n":            len(arr),
        "hardware_note": (
            "Latency measured on the evaluator's local machine. "
            "Results are NOT comparable across different hardware. "
            "Record CPU/GPU model when reporting."
        ),
    }
