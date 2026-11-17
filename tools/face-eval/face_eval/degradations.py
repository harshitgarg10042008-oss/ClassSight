"""face_eval/degradations.py

Synthetic degradations for LFW probe evaluations.
Each function takes an HxWx3 uint8 numpy array and returns an HxWx3 uint8 numpy array.
All degradations are marked as "simulated".
"""
from __future__ import annotations

import cv2
import numpy as np


def downscale_upscale(img: np.ndarray, target_px: int = 40) -> np.ndarray:
    """Simulated downscale then upscale (simulates far distance / low resolution)."""
    h, w = img.shape[:2]
    aspect = w / h if h > 0 else 1.0
    new_w = max(1, target_px)
    new_h = max(1, int(round(target_px / aspect)))

    downscaled = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    upscaled = cv2.resize(downscaled, (w, h), interpolation=cv2.INTER_LINEAR)
    return upscaled.astype(np.uint8)


def gaussian_blur(img: np.ndarray, sigma: float = 3.0) -> np.ndarray:
    """Simulated optical defocus / Gaussian blur."""
    # Compute odd kernel size based on sigma
    ksize = int(round(sigma * 4)) | 1
    ksize = max(3, ksize)
    return cv2.GaussianBlur(img, (ksize, ksize), sigmaX=sigma).astype(np.uint8)


def motion_blur(img: np.ndarray, kernel_size: int = 15) -> np.ndarray:
    """Simulated horizontal camera / subject motion blur."""
    kernel_size = max(1, int(kernel_size))
    kernel = np.zeros((kernel_size, kernel_size), dtype=np.float32)
    # Horizontal motion line in the center row
    kernel[int((kernel_size - 1) / 2), :] = np.ones(kernel_size, dtype=np.float32)
    kernel /= kernel_size
    return cv2.filter2D(img, -1, kernel).astype(np.uint8)


def low_brightness(img: np.ndarray, factor: float = 0.3) -> np.ndarray:
    """Simulated low-light / underexposed environment."""
    f = float(np.clip(factor, 0.0, 1.0))
    res = img.astype(np.float32) * f
    return np.clip(res, 0, 255).astype(np.uint8)


def high_brightness(img: np.ndarray, factor: float = 1.8) -> np.ndarray:
    """Simulated harsh lighting / overexposure."""
    f = float(max(1.0, factor))
    res = img.astype(np.float32) * f
    return np.clip(res, 0, 255).astype(np.uint8)


def jpeg_compression(img: np.ndarray, quality: int = 30) -> np.ndarray:
    """Simulated lossy JPEG compression artifacts."""
    q = int(np.clip(quality, 1, 100))
    # cv2 imencode expects BGR or handles raw channels
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), q]
    _, enc = cv2.imencode(".jpg", img, encode_param)
    dec = cv2.imdecode(enc, cv2.IMREAD_UNCHANGED)
    return dec.astype(np.uint8)


def perspective_warp(img: np.ndarray, angle_deg: float = 30.0) -> np.ndarray:
    """Simulated yaw-like perspective transform."""
    h, w = img.shape[:2]
    # Perspective squeeze factor proportional to angle
    squeeze = float(np.clip(abs(np.radians(angle_deg)) * 0.3, 0.0, 0.45))

    src_pts = np.float32([
        [0, 0],
        [w - 1, 0],
        [w - 1, h - 1],
        [0, h - 1]
    ])

    dst_pts = np.float32([
        [w * squeeze, 0],
        [w * (1.0 - squeeze * 0.5), 0],
        [w * (1.0 - squeeze * 0.5), h - 1],
        [w * squeeze, h - 1]
    ])

    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)
    return warped.astype(np.uint8)


def lower_face_occlusion(img: np.ndarray, fraction: float = 0.4) -> np.ndarray:
    """Simulated lower-face occlusion (black mask/block)."""
    h, w = img.shape[:2]
    frac = float(np.clip(fraction, 0.0, 1.0))
    start_y = int(round(h * (1.0 - frac)))

    out = img.copy()
    out[start_y:h, :] = 0
    return out.astype(np.uint8)


def lower_face_occlusion_beard_proxy(img: np.ndarray, fraction: float = 0.3) -> np.ndarray:
    """Simulated lower-face occlusion proxy.

    WARNING: This is a synthetic lower-face occlusion proxy — NOT a real beard test!
    It measures robustness to occlusion in the jaw/chin region, not facial hair textures.
    """
    return lower_face_occlusion(img, fraction=fraction)
