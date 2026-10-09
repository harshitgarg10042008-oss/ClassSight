import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import _vectorized_hungarian_matching, EnrolledStudent


def test_hungarian_one_to_one_assignment():
    """Verify that 2 faces competing for the same student get optimal 1-to-1 matching."""
    # Student 1 vector
    v1 = np.zeros(128, dtype=np.float64)
    v1[0] = 1.0

    # Student 2 vector
    v2 = np.zeros(128, dtype=np.float64)
    v2[1] = 1.0

    s1 = EnrolledStudent(student_id=1, roll_number="S001", embeddings=[v1.tolist()])
    s2 = EnrolledStudent(student_id=2, roll_number="S002", embeddings=[v2.tolist()])

    # Face 0 is closer to s1
    f0 = np.zeros(128, dtype=np.float64)
    f0[0] = 0.95
    f0[1] = 0.05
    # Face 1 is closer to s2
    f1 = np.zeros(128, dtype=np.float64)
    f1[0] = 0.05
    f1[1] = 0.95

    results = _vectorized_hungarian_matching([f0, f1], [s1, s2], distance_threshold=0.6, margin_threshold=0.05)

    assert len(results) == 2
    assert results[0]["student_id"] == 1
    assert results[0]["matched"] is True
    assert results[1]["student_id"] == 2
    assert results[1]["matched"] is True


def test_margin_check_downgrades_ambiguous_matches():
    """Verify that when top-1 and top-2 distances are within margin_threshold, it is flagged ambiguous."""
    v1 = np.zeros(128, dtype=np.float64)
    v1[0] = 1.0

    v2 = np.zeros(128, dtype=np.float64)
    v2[0] = 0.99
    v2[1] = 0.02

    s1 = EnrolledStudent(student_id=1, roll_number="S001", embeddings=[v1.tolist()])
    s2 = EnrolledStudent(student_id=2, roll_number="S002", embeddings=[v2.tolist()])

    # Face is almost equidistant to both
    f = np.zeros(128, dtype=np.float64)
    f[0] = 0.995
    f[1] = 0.01

    results = _vectorized_hungarian_matching([f], [s1, s2], distance_threshold=0.6, margin_threshold=0.10)
    assert len(results) == 1
    assert results[0]["is_ambiguous"] is True
    assert results[0]["matched"] is False, "Ambiguous match must not be accepted as valid match"
