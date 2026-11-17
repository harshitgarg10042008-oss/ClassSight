"""tests/test_interfaces.py

Verify that RecognizerAdapter and DatasetAdapter cannot be instantiated directly
because they are abstract base classes.
"""
from __future__ import annotations

import pytest

from face_eval.interfaces import RecognizerAdapter, DatasetAdapter


def test_recognizer_adapter_is_abstract():
    with pytest.raises(TypeError) as exc_info:
        RecognizerAdapter()  # type: ignore[abstract]
    assert "Can't instantiate abstract class" in str(exc_info.value)


def test_dataset_adapter_is_abstract():
    with pytest.raises(TypeError) as exc_info:
        DatasetAdapter()  # type: ignore[abstract]
    assert "Can't instantiate abstract class" in str(exc_info.value)
