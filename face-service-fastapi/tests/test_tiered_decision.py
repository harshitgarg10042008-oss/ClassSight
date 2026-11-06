import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import _manhattan_matching, EnrolledStudent


def test_single_enrolled_student_has_null_d2_and_auto_tier():
    """
    Edge case: if roster has fewer than 2 enrolled students, d2 does not exist.
    It must be None (serializes as null in JSON), margin is None, and tier is AUTO
    when d1 <= MANHATTAN_AUTO_ACCEPT.
    """
    v1 = np.zeros(128, dtype=np.float64)
    v1[0] = 1.0

    s1 = EnrolledStudent(student_id=1, roll_number="S001", embeddings=[v1.tolist()])

    # Probe is very close to student 1 (L1 distance = 0.05 <= 8.0)
    f0 = np.zeros(128, dtype=np.float64)
    f0[0] = 0.95
    f0[1] = 0.05

    results = _manhattan_matching([f0], [s1], distance_threshold=9.74)

    assert len(results) == 1
    res = results[0]
    assert res["student_id"] == 1
    assert res["matched"] is True
    assert res["tier"] == "AUTO"
    assert res["second_best_distance"] is None
    assert res["margin"] is None
    assert res["confidence_label"] == "HIGH"


def test_ambiguous_two_students_yields_review_tier():
    """
    When top-2 distance margin is smaller than MATCH_MARGIN (0.5),
    tier must be REVIEW and matched must be False.
    """
    v1 = np.zeros(128, dtype=np.float64)
    v1[0] = 1.0

    v2 = np.zeros(128, dtype=np.float64)
    v2[0] = 0.9
    v2[1] = 0.1

    s1 = EnrolledStudent(student_id=1, roll_number="S001", embeddings=[v1.tolist()])
    s2 = EnrolledStudent(student_id=2, roll_number="S002", embeddings=[v2.tolist()])

    # Probe is almost equidistant to both
    f0 = np.zeros(128, dtype=np.float64)
    f0[0] = 0.95
    f0[1] = 0.05

    results = _manhattan_matching([f0], [s1, s2], distance_threshold=9.74)

    assert len(results) == 1
    res = results[0]
    # Both students are close — regardless of who wins rank-1, the margin is tiny
    assert res["second_best_distance"] is not None
    assert res["margin"] is not None
    # Margin is small (< 0.5) → REVIEW tier
    assert res["tier"] == "REVIEW"
    assert res["matched"] is False
    assert res["confidence_label"] == "MEDIUM"


def test_distance_above_review_threshold_yields_unknown_tier():
    """
    When distance exceeds distance_threshold (T_review = 9.74),
    tier must be UNKNOWN and matched must be False.
    """
    v1 = np.zeros(128, dtype=np.float64)
    v1[0] = 1.0

    s1 = EnrolledStudent(student_id=1, roll_number="S001", embeddings=[v1.tolist()])

    # Probe has large L1 distance to student 1:
    # Put 1.0 on 5 separate dims (dims 10-14) none of which overlap with v1's dim 0.
    # L1 = |v1[0] - 0| + |0 - f[10]| + ... + |0 - f[14]|  = 1.0 + 5*1.0 = 6.0
    # → not enough. Use 10 dims: 1.0 + 10 = 11.0 > 9.74
    f0 = np.zeros(128, dtype=np.float64)
    for i in range(10):
        f0[10 + i] = 1.0   # dims 10-19, no overlap with v1's dim-0
    # L1(f0, v1) = 1.0 (dim 0 in v1, 0 in f0) + 10*1.0 (dims 10-19 in f0, 0 in v1) = 11.0

    results = _manhattan_matching([f0], [s1], distance_threshold=9.74)

    assert len(results) == 1
    res = results[0]
    assert res["distance"] > 9.74, f"Expected distance > 9.74, got {res['distance']}"
    assert res["tier"] == "UNKNOWN"
    assert res["matched"] is False
    assert res["confidence_label"] == "LOW"
