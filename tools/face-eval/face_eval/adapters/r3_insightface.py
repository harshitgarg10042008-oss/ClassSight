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
    """R3: InsightFace buffalo_l ArcFace 512-d, cosine distance."""

    def __init__(self, name: str = "buffalo_l") -> None:
        try:
            import insightface
            from insightface.app import FaceAnalysis
        except ImportError as e:
            raise ImportError("insightface not installed") from e

        self._app = FaceAnalysis(name=name, providers=["CPUExecutionProvider"])
        self._app.prepare(ctx_id=0, det_size=(160, 160))

    @property
    def name(self) -> str:
        return "InsightFace-buffalo_l-cosine"

    @property
    def embedding_dim(self) -> int:
        return 512

    @property
    def licence_note(self) -> str:
        return (
            "InsightFace models: Apache 2.0 for code; "
            "buffalo_l weights: for research/non-commercial use — commercial use NOT VERIFIED, needs legal review."
        )

    def embed(self, aligned_face: np.ndarray) -> np.ndarray:
        """Extract 512-d L2-normalized embedding from RGB image or face crop."""
        import cv2

        # Convert RGB to BGR for InsightFace
        img_bgr = cv2.cvtColor(aligned_face, cv2.COLOR_RGB2BGR) if aligned_face.shape[-1] == 3 else aligned_face

        # Try app.get() detection first
        faces = self._app.get(img_bgr)
        if faces and hasattr(faces[0], "normed_embedding") and faces[0].normed_embedding is not None:
            return np.asarray(faces[0].normed_embedding, dtype=np.float32)

        # Fallback for tightly cropped faces where detector may fail:
        # call the recognition sub-model directly if present
        if hasattr(self._app, "models") and "recognition" in self._app.models:
            rec_model = self._app.models["recognition"]
            emb = rec_model.get(img_bgr)
            if emb is not None:
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                return np.asarray(emb, dtype=np.float32)

        # If still nothing, return a zero embedding placeholder
        return np.zeros(self.embedding_dim, dtype=np.float32)

    def distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """Cosine distance for L2-normalized vectors: 1 - (a @ b)."""
        dot = float(np.dot(a, b))
        return float(max(0.0, 1.0 - dot))
