import sys
from pathlib import Path

import numpy as np
from PIL import Image
import io

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import _load_rgb_image, _quality_metrics  # noqa: E402


def test_recognition_decode_caps_large_image_dimension():
    image = Image.new("RGB", (3200, 2000), "white")
    payload = io.BytesIO()
    image.save(payload, format="JPEG")
    decoded = _load_rgb_image(payload.getvalue())
    assert max(decoded.shape[:2]) == 1600


def test_sharp_well_lit_image_passes_quality_checks():
    image = np.zeros((240, 320, 3), dtype=np.uint8)
    image[:, :, :] = 128
    image[40:200:4, 60:260:4, :] = 255
    metrics = _quality_metrics(image, [])
    assert metrics.quality_passed is True
    assert metrics.blur_score >= 30
    assert 35 <= metrics.brightness_mean <= 220


def test_blurred_image_is_flagged():
    image = np.full((240, 320, 3), 128, dtype=np.uint8)
    metrics = _quality_metrics(image, [])
    assert metrics.quality_passed is False
    assert any("blurry" in warning for warning in metrics.warnings)


def test_dark_image_is_flagged():
    image = np.zeros((240, 320, 3), dtype=np.uint8)
    metrics = _quality_metrics(image, [])
    assert metrics.quality_passed is False
    assert any("dark" in warning for warning in metrics.warnings)
