"""face_eval/adapters/r3_insightface.py

R3: InsightFace buffalo_l (ArcFace), cosine distance.
- buffalo_l pretrained weights
- 512-d L2-normalized feature representation
- Cosine distance: 1 - (a @ b)
"""
from __future__ import annotations

import numpy as np

from face_eval.interfaces import RecognizerAdapter


class R3InsightFaceRecognizer(RecognizerAdapter):
    """R3: InsightFace buffalo_s/buffalo_l ArcFace 512-d, cosine distance."""

    def __init__(self, name: str = "buffalo_s") -> None:
        try:
            import insightface
            from insightface.app import FaceAnalysis
        except ImportError as e:
            raise ImportError("insightface not installed") from e

        self.model_name = name
        try:
            self._app = FaceAnalysis(name=name, providers=["CPUExecutionProvider"])
            self._app.prepare(ctx_id=0, det_size=(256, 256))
        except Exception:
            # Fallback to buffalo_s
            self.model_name = "buffalo_s"
            self._app = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
            self._app.prepare(ctx_id=0, det_size=(256, 256))

    @property
    def name(self) -> str:
        return f"InsightFace-{self.model_name}-cosine"

    @property
    def embedding_dim(self) -> int:
        return 512

    @property
    def licence_note(self) -> str:
        return (
            "InsightFace models: Apache 2.0 for code; "
            "buffalo_s/l weights: for research/non-commercial use — commercial use NOT VERIFIED, needs legal review."
        )

    def embed(self, aligned_face: np.ndarray) -> np.ndarray:
        """Extract 512-d L2-normalized embedding from RGB image or face crop."""
        import cv2

        # Convert RGB to BGR for InsightFace
        img_bgr = cv2.cvtColor(aligned_face, cv2.COLOR_RGB2BGR) if aligned_face.shape[-1] == 3 else aligned_face.copy()

        # 1. Detection and landmark alignment
        try:
            faces = self._app.get(img_bgr)
            if faces and hasattr(faces[0], "normed_embedding") and faces[0].normed_embedding is not None:
                return np.asarray(faces[0].normed_embedding, dtype=np.float32)
        except Exception:
            pass

        # 2. Fallback for pre-cropped faces where detector might miss
        if hasattr(self._app, "models") and "recognition" in self._app.models:
            rec_model = self._app.models["recognition"]
            in_w, in_h = rec_model.input_size
            crop_resized = cv2.resize(img_bgr, (in_w, in_h))
            feats = rec_model.get_feat(crop_resized)
            if feats is not None and len(feats) > 0:
                feat = feats[0].flatten()
                norm = float(np.linalg.norm(feat))
                if norm > 1e-8:
                    feat = feat / norm
                return np.asarray(feat, dtype=np.float32)

        return np.zeros(self.embedding_dim, dtype=np.float32)

    def distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """Cosine distance for L2-normalized vectors: 1 - (a @ b)."""
        dot = float(np.dot(a, b))
        return float(max(0.0, 1.0 - dot))
