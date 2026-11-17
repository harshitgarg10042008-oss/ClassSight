"""face_eval/adapters/r0_baseline.py

R0: Exact production pipeline reconstruction.
- InceptionResnetV1(pretrained="vggface2", classify=False)
- Deterministic seed-42 orthonormal QR projection from 512-d to 128-d
- L2-normalized 128-d embedding
- Manhattan (L1) distance matching
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from face_eval.interfaces import RecognizerAdapter


class R0BaselineRecognizer(RecognizerAdapter):
    """R0: Production baseline (FaceNet 128-d seed-42 QR projection, L1)."""

    def __init__(self, device: str = "cpu") -> None:
        try:
            import torch
            import torchvision.transforms as T
            from facenet_pytorch import InceptionResnetV1
        except ImportError as e:
            raise ImportError(
                "facenet-pytorch or torch is not installed. Install requirements-eval.txt to use R0."
            ) from e

        self.device = torch.device(device)
        self.model = InceptionResnetV1(pretrained="vggface2", classify=False).eval().to(self.device)

        self.transform = T.Compose([
            T.Resize((160, 160)),
            T.ToTensor(),
            T.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
        ])

        # Deterministic orthonormal projection matrix (seed=42)
        rng = np.random.RandomState(42)
        H = rng.randn(512, 128).astype(np.float32)
        Q, _ = np.linalg.qr(H)  # (512, 128), Q.T @ Q = I_128
        self._proj = torch.from_numpy(Q.T).to(self.device)  # (128, 512)

    @property
    def name(self) -> str:
        return "FaceNet-128d-seed42-L1 (Baseline)"

    @property
    def embedding_dim(self) -> int:
        return 128

    @property
    def licence_note(self) -> str:
        return (
            "FaceNet weights: MIT licence (facenet-pytorch). "
            "vggface2 dataset: research/non-commercial only — commercial use NOT VERIFIED, needs legal review."
        )

    def embed(self, aligned_face: np.ndarray) -> np.ndarray:
        """Compute 128-d L2-normalized embedding for RGB face crop."""
        import torch

        if isinstance(aligned_face, np.ndarray):
            pil_img = Image.fromarray(aligned_face.astype(np.uint8))
        else:
            pil_img = aligned_face

        tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            emb_512 = self.model(tensor)  # (1, 512)
            emb_128 = torch.matmul(emb_512, self._proj.t())  # (1, 128)
            emb_128 = emb_128 / torch.norm(emb_128, p=2, dim=1, keepdim=True)
            return emb_128.squeeze(0).cpu().numpy().astype(np.float32)

    def distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """Manhattan (L1) distance."""
        return float(np.sum(np.abs(a - b)))
