import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import _recognition_state  # noqa: E402


def test_recognized_state_requires_a_matching_candidate_without_warnings():
    assert _recognition_state(True, [], True) == 'RECOGNIZED'


def test_low_confidence_state_is_distinct_from_unknown():
    assert _recognition_state(False, [], True) == 'LOW_CONFIDENCE'
    assert _recognition_state(False, [], False) == 'UNKNOWN'


def test_quality_warning_requires_recapture_state():
    assert _recognition_state(True, ['image blurry'], True) == 'RECAPTURE_REQUIRED'
