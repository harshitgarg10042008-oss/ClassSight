"""face_eval/datasets/lfw_dataset.py

LFW (Labeled Faces in the Wild) dataset adapter.
Supports full LFW folder hierarchy, test fixtures, and identity-disjoint
calibration/test splits.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterator

import numpy as np

from face_eval.interfaces import DatasetAdapter


class LFWDataset(DatasetAdapter):
    """Adapter for the LFW dataset."""

    def __init__(
        self,
        path: str | Path = "C:/Users/vishe/scikit_learn_data/lfw_home/lfw_funneled",
        calibration_fraction: float = 0.3,
        seed: int = 42,
    ) -> None:
        self.root_path = Path(path)
        self.calibration_fraction = calibration_fraction
        self.seed = seed

        # Resolve path with fallbacks
        if not self.root_path.exists():
            candidates = [
                Path("eval_data/lfw"),
                Path("tests/fixtures/lfw_test30"),
                Path("../tests/fixtures/lfw_test30"),
                Path("../../tests/fixtures/lfw_test30"),
            ]
            for c in candidates:
                if c.exists():
                    self.root_path = c.resolve()
                    break

        if not self.root_path.exists():
            raise FileNotFoundError(
                f"LFW data path does not exist: {path}. "
                "Ensure LFW data is present at the configured path or tests/fixtures/lfw_test30."
            )

        # Discover identities and their images
        self._identities_map: dict[str, list[Path]] = {}
        self._all_items: list[tuple[str, Path]] = []
        self._scan_dataset()

        # Calibration vs Test split
        self.calibration_ids: set[str] = set()
        self.test_ids: set[str] = set()
        self._compute_split()

    def _scan_dataset(self) -> None:
        """Scan folder for images, handling subfolders or flat fixtures."""
        subdirs = [p for p in self.root_path.iterdir() if p.is_dir()]
        if subdirs:
            # Hierarchy: root/<identity>/<image>.jpg
            for sdir in subdirs:
                imgs = sorted(list(sdir.glob("*.jpg")) + list(sdir.glob("*.jpeg")) + list(sdir.glob("*.png")))
                if imgs:
                    identity = sdir.name
                    self._identities_map[identity] = imgs
                    for img in imgs:
                        self._all_items.append((identity, img))
        else:
            # Flat fixture directory: e.g. 01_Tom_Coverdale_a.jpg
            flat_imgs = sorted(list(self.root_path.glob("*.jpg")) + list(self.root_path.glob("*.png")))
            for img in flat_imgs:
                # Strip prefix like "01_" and suffix like "_a.jpg"
                name_parts = img.stem.split("_")
                if len(name_parts) >= 3 and name_parts[0].isdigit():
                    identity = "_".join(name_parts[1:-1])
                elif len(name_parts) >= 2 and name_parts[-1] in ("a", "b", "c"):
                    identity = "_".join(name_parts[:-1])
                else:
                    identity = img.stem
                self._identities_map.setdefault(identity, []).append(img)
                self._all_items.append((identity, img))

    def _compute_split(self) -> None:
        """Identity-disjoint split into calibration and test sets."""
        manifest_path = Path("tools/eval/split_manifest.json")
        if not manifest_path.exists():
            manifest_path = Path("../../tools/eval/split_manifest.json")

        if manifest_path.exists():
            try:
                with manifest_path.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                    cal_ids = set(data.get("calibration_identities", []))
                    if cal_ids:
                        self.calibration_ids = cal_ids
                        self.test_ids = set(self._identities_map.keys()) - self.calibration_ids
                        return
            except Exception:
                pass

        # Fallback deterministic random split
        all_ids = sorted(list(self._identities_map.keys()))
        rng = np.random.RandomState(self.seed)
        shuffled = list(all_ids)
        rng.shuffle(shuffled)

        n_cal = int(np.floor(len(shuffled) * self.calibration_fraction))
        self.calibration_ids = set(shuffled[:n_cal])
        self.test_ids = set(shuffled[n_cal:])

    def __iter__(self) -> Iterator[tuple[str, Path, list[str]]]:
        for identity, img_path in self._all_items:
            yield (identity, img_path, ["lfw"])

    def __len__(self) -> int:
        return len(self._all_items)

    def get_pairs(self, split: str = "all", max_pairs_per_id: int = 5) -> tuple[list[tuple[Path, Path]], list[int]]:
        """Generate same-identity (1) and different-identity (0) image pairs.

        split can be 'all', 'calibration', or 'test'.
        """
        if split == "calibration":
            allowed_ids = self.calibration_ids
        elif split == "test":
            allowed_ids = self.test_ids
        else:
            allowed_ids = set(self._identities_map.keys())

        # Collect genuine pairs
        pairs: list[tuple[Path, Path]] = []
        labels: list[int] = []

        valid_ids = [i for i in sorted(allowed_ids) if i in self._identities_map and len(self._identities_map[i]) >= 2]
        for ident in valid_ids:
            imgs = self._identities_map[ident]
            count = 0
            for i in range(len(imgs)):
                for j in range(i + 1, len(imgs)):
                    pairs.append((imgs[i], imgs[j]))
                    labels.append(1)
                    count += 1
                    if count >= max_pairs_per_id:
                        break
                if count >= max_pairs_per_id:
                    break

        # Collect impostor pairs (equal number)
        n_genuine = len(pairs)
        rng = np.random.RandomState(self.seed)
        all_valid_ids = [i for i in sorted(allowed_ids) if i in self._identities_map and len(self._identities_map[i]) >= 1]
        if len(all_valid_ids) >= 2:
            impostor_count = 0
            while impostor_count < n_genuine:
                id1, id2 = rng.choice(all_valid_ids, size=2, replace=False)
                img1 = rng.choice(self._identities_map[id1])
                img2 = rng.choice(self._identities_map[id2])
                pairs.append((img1, img2))
                labels.append(0)
                impostor_count += 1

        return pairs, labels
