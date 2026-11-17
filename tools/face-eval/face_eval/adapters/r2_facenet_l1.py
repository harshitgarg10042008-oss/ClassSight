"""face_eval/adapters/r2_facenet_l1.py

R2: FaceNet 512-d, NO projection, raw L1 distance.
- InceptionResnetV1(pretrained="vggface2", classify=False)
- Full 512-d native features, unnormalized
- Manhattan (L1) distance: sum(|a - b|)
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from face_eval.interfaces import RecognizerAdapter


class R2FaceNetL1Recognizer(RecognizerAdapter):
    """R2: FaceNet 512-d, no projection, unnormalized L1 distance."""

    def __init__(self, device: str = "cpu") -> None:
        try:
            import torch
            import torchvision.transforms as T
            from facenet_pytorch import InceptionResnetV1
        except ImportError as e:
            raise ImportError(
                "facenet-pytorch or torch is not installed. Install requirements-eval.txt to use R2."
            ) from e

        self.device = torch.device(device)
        self.model = InceptionResnetV1(pretrained="vggface2", classify=False).eval().to(self.device)

        self.transform = T.Compose([
            T.Resize((160, 160)),
            T.ToTensor(),
            T.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
        ])

    @property
    def name(self) -> str:
        return "FaceNet-512d-L1"

    @property
    def embedding_dim(self) -> int:
        return 512

    @property
    def licence_note(self) -> str:
        return (
            "FaceNet weights: MIT licence (facenet-pytorch). "
            "vggface2 dataset: research/non-commercial only — commercial use NOT VERIFIED, needs legal review."
        )

    def embed(self, aligned_face: np.ndarray) -> np.ndarray:
        """Compute 512-d raw (unnormalized) embedding for RGB face crop."""
        import torch

        if isinstance(aligned_face, np.ndarray):
            pil_img = Image.fromarray(aligned_face.astype(np.uint8))
        else:
            pil_img = aligned_face

        tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            emb_512 = self.model(tensor)  # (1, 512)
            return emb_512.squeeze(0).cpu().numpy().astype(np.float32)

    def distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """Manhattan (L1) distance: sum(|a - b|)."""
        return float(np.sum(np.abs(a - b)))
