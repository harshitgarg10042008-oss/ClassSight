"""tests/test_metrics.py

Unit tests for face_eval/metrics.py using small hand-computed examples.
"""
from __future__ import annotations

import numpy as np
import pytest

from face_eval.metrics import (
    eer,
    tar_at_far,
    wilson_ci,
    tier_distribution,
    open_set_far,
    rank1_accuracy,
    bootstrap_ci,
    latency_stats,
    wrong_identity_in_auto,
)


def test_eer_perfect_separation():
    # Perfect separation: genuines higher than impostors
    scores = [0.9, 0.8, 0.2, 0.1]
    labels = [1, 1, 0, 0]
    res = eer(scores, labels)
    assert res["eer"] == 0.0
    assert 0.2 <= res["threshold"] <= 0.8


def test_eer_random_scores():
    # Overlapping / random scores
    rng = np.random.RandomState(42)
    scores = rng.uniform(0.0, 1.0, size=200)
    labels = rng.randint(0, 2, size=200)
    res = eer(scores, labels)
    assert 0.35 <= res["eer"] <= 0.65


def test_eer_hand_computed_4_pairs():
    # 2 genuines, 2 impostors
    # Genuines at 0.7, 0.4; Impostors at 0.6, 0.3
    # At threshold 0.6: FAR = 1/2 (0.6 accepted), FRR = 1/2 (0.4 rejected) -> EER = 0.5
    scores = [0.7, 0.4, 0.6, 0.3]
    labels = [1, 1, 0, 0]
    res = eer(scores, labels)
    assert res["eer"] == pytest.approx(0.5, abs=0.1)


def test_tar_at_far_hand_computed():
    # 10 impostor scores: 0.1 to 1.0
    # 4 genuine scores: 0.85, 0.9, 0.95, 1.0
    impostors = [0.1 * i for i in range(1, 11)]  # 0.1 .. 1.0
    genuines = [0.85, 0.9, 0.95, 1.0]
    scores = genuines + impostors
    labels = [1] * len(genuines) + [0] * len(impostors)

    res = tar_at_far(scores, labels, far_targets=[0.2])
    # At FAR=0.2 (2/10 impostors allowed), impostors >= 0.9 (0.9, 1.0)
    # Genuines >= 0.9: 0.9, 0.95, 1.0 -> 3/4 = 0.75
    assert 0.2 in res
    assert res[0.2]["tar"] >= 0.5


def test_wilson_ci():
    # k=10, n=100 gives approx [0.049, 0.177] (specifically [0.055, 0.174])
    lower, upper = wilson_ci(10, 100)
    assert 0.04 <= lower <= 0.07
    assert 0.16 <= upper <= 0.19
    assert lower < upper


def test_tier_distribution():
    # 10 pairs with known distances
    # T_auto = 8.0, T_review = 9.74, M = 0.5
    distances = [2.0, 3.0, 5.0, 7.0, 8.5, 9.0, 9.5, 10.0, 11.0, 12.0]
    # Expected: 4 auto (<8.0), 3 review (8.0..9.74), 3 unknown (>=9.74)
    res = tier_distribution(distances, T_auto=8.0, T_review=9.74, M=0.5)

    assert res["n_total"] == 10
    assert res["n_auto"] == 4
    assert res["n_review"] == 3
    assert res["n_unknown"] == 3
    assert res["auto"] == pytest.approx(0.4)
    assert res["review"] == pytest.approx(0.3)
    assert res["unknown"] == pytest.approx(0.3)


def test_open_set_far():
    # 5 impostors, 2 above threshold -> FAR = 0.4
    impostor_scores = [0.1, 0.2, 0.3, 0.8, 0.9]
    res = open_set_far(impostor_scores, threshold=0.5)

    assert res["n_tested"] == 5
    assert res["far"] == pytest.approx(0.4)
    assert 0.0 <= res["ci_lower"] <= res["far"] <= res["ci_upper"] <= 1.0
    assert "Upper-bound FAR" in res["upper_bound_statement"]


def test_rank1_accuracy():
    # 3 gallery, 3 probe, exact identity match -> 1.0
    gallery_embeddings = np.array([
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
    ])
    gallery_ids = ["Alice", "Bob", "Charlie"]

    probe_embeddings = np.array([
        [0.9, 0.1, 0.0],  # closest to Alice
        [0.1, 0.9, 0.0],  # closest to Bob
        [0.0, 0.1, 0.9],  # closest to Charlie
    ])
    probe_ids = ["Alice", "Bob", "Charlie"]

    def l1_dist(a, b):
        return float(np.sum(np.abs(a - b)))

    acc = rank1_accuracy(gallery_embeddings, gallery_ids, probe_embeddings, probe_ids, l1_dist)
    assert acc == pytest.approx(1.0)


def test_bootstrap_ci():
    # Check shape and range
    rng = np.random.RandomState(42)
    scores = np.concatenate([rng.uniform(0.6, 1.0, size=20), rng.uniform(0.0, 0.4, size=20)])
    labels = np.array([1] * 20 + [0] * 20)

    def simple_metric(s, l):
        return float(np.mean(s[l == 1]))

    lower, upper = bootstrap_ci(simple_metric, scores, labels, n_boot=100, ci=0.95, seed=42)
    assert 0.0 <= lower <= upper <= 1.0


def test_latency_stats():
    # [10, 20, 30, 40, 50] -> median=30, p95 around 48-50
    times = [10.0, 20.0, 30.0, 40.0, 50.0]
    res = latency_stats(times)

    assert res["median_ms"] == pytest.approx(30.0)
    assert 45.0 <= res["p95_ms"] <= 50.0
    assert res["mean_ms"] == pytest.approx(30.0)
    assert res["n"] == 5
    assert "hardware_note" in res


def test_wrong_identity_in_auto():
    # 3 predictions vs ground truth
    matches = [("Alice", "probe1"), ("Bob", "probe2"), ("Eve", "probe3")]
    ground_truth = [("Alice", "probe1"), ("Bob", "probe2"), ("Charlie", "probe3")]

    errors = wrong_identity_in_auto(matches, ground_truth)
    assert errors == 1  # Eve != Charlie
