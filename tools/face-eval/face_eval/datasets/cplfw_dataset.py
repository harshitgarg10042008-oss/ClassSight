"""face_eval/datasets/cplfw_dataset.py

CPLFW (Cross-Pose LFW) dataset adapter.
Attempts download from http://whdeng.cn/CPLFW (up to 3 attempts).
If unavailable or not present on disk, raises:
  FileNotFoundError("CPLFW NOT VERIFIED: download failed or data not found at <path>")
"""
from __future__ import annotations

import logging
import urllib.request
from pathlib import Path
from typing import Iterator

from face_eval.interfaces import DatasetAdapter

logger = logging.getLogger("face_eval.datasets.cplfw")

CPLFW_DOWNLOAD_URL = "http://whdeng.cn/CPLFW/cplfw.zip"


class CPLFWDataset(DatasetAdapter):
    """Adapter for CPLFW dataset."""

    def __init__(self, path: str | Path = "eval_data/cplfw") -> None:
        self.root_path = Path(path)
        self._items: list[tuple[str, Path, list[str]]] = []

        if not self.root_path.exists():
            downloaded = self._attempt_download()
            if not downloaded:
                raise FileNotFoundError(
                    f"CPLFW NOT VERIFIED: download failed or data not found at {self.root_path}"
                )

        self._scan()
        if not self._items:
            raise FileNotFoundError(
                f"CPLFW NOT VERIFIED: download failed or data not found at {self.root_path}"
            )

    def _attempt_download(self) -> bool:
        """Attempt download up to 3 times."""
        logger.info("Attempting download of CPLFW from %s", CPLFW_DOWNLOAD_URL)
        for attempt in range(1, 4):
            try:
                self.root_path.mkdir(parents=True, exist_ok=True)
                zip_target = self.root_path / "cplfw.zip"
                urllib.request.urlretrieve(CPLFW_DOWNLOAD_URL, str(zip_target))
                import zipfile
                with zipfile.ZipFile(zip_target, "r") as zf:
                    zf.extractall(self.root_path)
                return True
            except Exception as exc:
                logger.warning("CPLFW download attempt %d/3 failed: %s", attempt, exc)
        return False

    def _scan(self) -> None:
        if not self.root_path.exists():
            return
        imgs = sorted(list(self.root_path.rglob("*.jpg")) + list(self.root_path.rglob("*.png")))
        for img in imgs:
            identity = img.parent.name if img.parent != self.root_path else img.stem.split("_")[0]
            self._items.append((identity, img, ["cplfw", "cross_pose"]))

    def __iter__(self) -> Iterator[tuple[str, Path, list[str]]]:
        for identity, img_path, tags in self._items:
            yield (identity, img_path, tags)

    def __len__(self) -> int:
        return len(self._items)
