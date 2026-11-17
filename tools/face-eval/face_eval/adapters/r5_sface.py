"""face_eval/adapters/r5_sface.py

R5: OpenCV SFace ONNX (OpenCV Zoo).
- Lightweight mobile face recognition model (128-d)
- Uses cv2.FaceRecognizerSF.create()
- Cosine distance matching
"""
from __future__ import annotations

import urllib.request
from pathlib import Path

import numpy as np

from face_eval.interfaces import RecognizerAdapter

SFACE_URL = (
    "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_recognition_sface/"
    "face_recognition_sface_2021dec.onnx"
)


class R5SFaceRecognizer(RecognizerAdapter):
    """R5: OpenCV SFace 128-d ONNX model."""

    def __init__(self, model_path: str | Path | None = None) -> None:
        try:
            import cv2
        except ImportError as e:
            raise ImportError("opencv-python is not installed") from e

        if not hasattr(cv2, "FaceRecognizerSF"):
            raise ImportError("cv2.FaceRecognizerSF is not available in this OpenCV build")

        if model_path is None:
            cache_dir = Path(".work/models")
            cache_dir.mkdir(parents=True, exist_ok=True)
            target = cache_dir / "face_recognition_sface_2021dec.onnx"
            if not target.exists():
                try:
                    urllib.request.urlretrieve(SFACE_URL, str(target))
                except Exception as exc:
                    raise FileNotFoundError(
                        f"Could not download SFace model from {SFACE_URL}: {exc}. "
                        "Download it manually and pass model_path."
                    ) from exc
            model_path = target

        model_path = Path(model_path)
        if not model_path.exists():
            raise FileNotFoundError(f"SFace model file not found at: {model_path}")

        self._model = cv2.FaceRecognizerSF.create(str(model_path), "")

    @property
    def name(self) -> str:
        return "ONNX-SFace"

    @property
    def embedding_dim(self) -> int:
        return 128

    @property
    def licence_note(self) -> str:
        return (
            "SFace: Apache 2.0 (OpenCV Zoo). "
            "Commercial use: check Apache 2.0 — NOT VERIFIED by legal review."
        )

    def embed(self, aligned_face: np.ndarray) -> np.ndarray:
        """Compute 128-d embedding using cv2.FaceRecognizerSF."""
        import cv2

        # Convert RGB to BGR for OpenCV
        if aligned_face.shape[-1] == 3:
            img = cv2.cvtColor(aligned_face, cv2.COLOR_RGB2BGR)
        else:
            img = aligned_face

        # Resize to standard SFace input (112x112)
        resized = cv2.resize(img, (112, 112))
        feature = self._model.feature(resized)
        if feature is None or len(feature) == 0:
            return np.zeros(self.embedding_dim, dtype=np.float32)

        feat_arr = feature.flatten().astype(np.float32)
        # SFace features are already L2-normalized or can be normalized
        norm = np.linalg.norm(feat_arr)
        if norm > 0:
            feat_arr = feat_arr / norm
        return feat_arr

    def distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """Cosine distance: 1 - cosine_similarity."""
        dot = float(np.dot(a, b))
        return float(max(0.0, 1.0 - dot))
