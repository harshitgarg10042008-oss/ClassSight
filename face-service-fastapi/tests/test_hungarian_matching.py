"""
test_hungarian_matching.py
~~~~~~~~~~~~~~~~~~~~~~~~~~
Tests for the greedy nearest-neighbour matching logic (_manhattan_matching).

The previous Euclidean-distance + scipy.optimize.linear_sum_assignment (Hungarian)
implementation has been replaced by a greedy Manhattan distance matcher that
processes faces most-confident-first and prevents double-assignment.

These tests verify that:
  1. two faces competing for two students each get the correct one-to-one assignment
  2. an ambiguous probe (small top-1/top-2 margin) is routed to REVIEW tier

NOTE: MATCH_MARGIN is read from the environment; here we exercise the M=0.5 default.
"""
import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import _manhattan_matching, EnrolledStudent


def test_one_to_one_assignment():
    """
    Two faces competing for two students: the greedy matcher must assign each
    face to the correct nearest-neighbour student (one-to-one, no double-claim).
    """
    # Student 1 unit vector on dim-0
    v1 = np.zeros(128, dtype=np.float64)
    v1[0] = 1.0

    # Student 2 unit vector on dim-1
    v2 = np.zeros(128, dtype=np.float64)
    v2[1] = 1.0

    s1 = EnrolledStudent(student_id=1, roll_number="S001", embeddings=[v1.tolist()])
    s2 = EnrolledStudent(student_id=2, roll_number="S002", embeddings=[v2.tolist()])

    # Face 0 is closer to s1 (dim-0 heavy)
    f0 = np.zeros(128, dtype=np.float64)
    f0[0] = 0.95
    f0[1] = 0.05

    # Face 1 is closer to s2 (dim-1 heavy)
    f1 = np.zeros(128, dtype=np.float64)
    f1[0] = 0.05
    f1[1] = 0.95

    results = _manhattan_matching([f0, f1], [s1, s2], distance_threshold=9.74)

    assert len(results) == 2
    assert results[0]["student_id"] == 1, f"Face 0 should match s1, got {results[0]['student_id']}"
    assert results[1]["student_id"] == 2, f"Face 1 should match s2, got {results[1]['student_id']}"
    # Both are close → AUTO tier (d1 ≤ MANHATTAN_AUTO_ACCEPT=8.0 and margin≥0.5 or M=0)
    for res in results:
        assert res["matched"] is True


def test_margin_check_downgrades_ambiguous_matches():
    """
    When top-1 and top-2 distances are within MATCH_MARGIN (default 0.5),
    the result must be REVIEW tier with matched=False.
    """
    # Two very similar student vectors
    v1 = np.zeros(128, dtype=np.float64)
    v1[0] = 1.0

    v2 = np.zeros(128, dtype=np.float64)
    v2[0] = 0.99
    v2[1] = 0.02

    s1 = EnrolledStudent(student_id=1, roll_number="S001", embeddings=[v1.tolist()])
    s2 = EnrolledStudent(student_id=2, roll_number="S002", embeddings=[v2.tolist()])

    # Probe almost equidistant to both → tiny margin
    f = np.zeros(128, dtype=np.float64)
    f[0] = 0.995
    f[1] = 0.01

    results = _manhattan_matching([f], [s1, s2], distance_threshold=9.74)
    assert len(results) == 1
    res = results[0]
    # margin = d2 - d1 ≪ MATCH_MARGIN=0.5 → REVIEW
    assert res["margin"] is not None
    assert res["margin"] < 0.5, f"Expected small margin, got {res['margin']}"
    assert res["tier"] == "REVIEW", f"Expected REVIEW, got {res['tier']}"
    assert res["matched"] is False, "Ambiguous match must not be accepted as valid match"
