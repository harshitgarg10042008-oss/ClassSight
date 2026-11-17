"""tests/test_degradations.py

Smoke tests for synthetic degradations in face_eval/degradations.py.
"""
from __future__ import annotations

import numpy as np
import pytest

from face_eval.degradations import (
    downscale_upscale,
    gaussian_blur,
    motion_blur,
    low_brightness,
    high_brightness,
    jpeg_compression,
    perspective_warp,
    lower_face_occlusion,
    lower_face_occlusion_beard_proxy,
)


@pytest.fixture
def sample_image() -> np.ndarray:
    rng = np.random.RandomState(42)
    return rng.randint(0, 256, size=(160, 160, 3), dtype=np.uint8)


def test_downscale_upscale_shape(sample_image):
    out = downscale_upscale(sample_image, target_px=30)
    assert out.shape == sample_image.shape
    assert out.dtype == np.uint8


def test_gaussian_blur_shape(sample_image):
    out = gaussian_blur(sample_image, sigma=2.5)
    assert out.shape == sample_image.shape
    assert out.dtype == np.uint8


def test_motion_blur_shape(sample_image):
    out = motion_blur(sample_image, kernel_size=11)
    assert out.shape == sample_image.shape
    assert out.dtype == np.uint8


def test_low_brightness_shape_and_range(sample_image):
    out = low_brightness(sample_image, factor=0.4)
    assert out.shape == sample_image.shape
    assert out.dtype == np.uint8
    assert np.mean(out) <= np.mean(sample_image)


def test_high_brightness_shape_and_range(sample_image):
    out = high_brightness(sample_image, factor=1.5)
    assert out.shape == sample_image.shape
    assert out.dtype == np.uint8
    assert np.mean(out) >= np.mean(sample_image)


def test_jpeg_compression_shape(sample_image):
    out = jpeg_compression(sample_image, quality=20)
    assert out.shape == sample_image.shape
    assert out.dtype == np.uint8


def test_perspective_warp_shape(sample_image):
    out = perspective_warp(sample_image, angle_deg=25.0)
    assert out.shape == sample_image.shape
    assert out.dtype == np.uint8


def test_lower_face_occlusion_shape_and_effect(sample_image):
    out = lower_face_occlusion(sample_image, fraction=0.4)
    assert out.shape == sample_image.shape
    assert out.dtype == np.uint8
    # Bottom 40% rows should be completely zeroed
    h = sample_image.shape[0]
    cutoff = int(h * 0.6)
    assert np.all(out[cutoff:, :, :] == 0)


def test_lower_face_occlusion_beard_proxy_shape(sample_image):
    out = lower_face_occlusion_beard_proxy(sample_image, fraction=0.3)
    assert out.shape == sample_image.shape
    assert out.dtype == np.uint8
    h = sample_image.shape[0]
    cutoff = int(h * 0.7)
    assert np.all(out[cutoff:, :, :] == 0)
