"""face_eval/datasets/calfw_dataset.py

CALFW (Cross-Age LFW) dataset adapter.
Attempts download from http://whdeng.cn/CALFW (up to 3 attempts).
If unavailable or not present on disk, raises:
  FileNotFoundError("CALFW NOT VERIFIED: download failed or data not found at <path>")
"""
from __future__ import annotations

import logging
import urllib.request
from pathlib import Path
from typing import Iterator

from face_eval.interfaces import DatasetAdapter

logger = logging.getLogger("face_eval.datasets.calfw")

CALFW_DOWNLOAD_URL = "http://whdeng.cn/CALFW/calfw.zip"


class CALFWDataset(DatasetAdapter):
    """Adapter for CALFW dataset."""

    def __init__(self, path: str | Path = "eval_data/calfw") -> None:
        self.root_path = Path(path)
        self._items: list[tuple[str, Path, list[str]]] = []

        if not self.root_path.exists():
            downloaded = self._attempt_download()
            if not downloaded:
                raise FileNotFoundError(
                    f"CALFW NOT VERIFIED: download failed or data not found at {self.root_path}"
                )

        self._scan()
        if not self._items:
            raise FileNotFoundError(
                f"CALFW NOT VERIFIED: download failed or data not found at {self.root_path}"
            )

    def _attempt_download(self) -> bool:
        """Attempt download up to 3 times."""
        logger.info("Attempting download of CALFW from %s", CALFW_DOWNLOAD_URL)
        for attempt in range(1, 4):
            try:
                self.root_path.mkdir(parents=True, exist_ok=True)
                zip_target = self.root_path / "calfw.zip"
                urllib.request.urlretrieve(CALFW_DOWNLOAD_URL, str(zip_target))
                # If downloaded, try extracting
                import zipfile
                with zipfile.ZipFile(zip_target, "r") as zf:
                    zf.extractall(self.root_path)
                return True
            except Exception as exc:
                logger.warning("CALFW download attempt %d/3 failed: %s", attempt, exc)
        return False

    def _scan(self) -> None:
        if not self.root_path.exists():
            return
        imgs = sorted(list(self.root_path.rglob("*.jpg")) + list(self.root_path.rglob("*.png")))
        for img in imgs:
            # Identity is parent dir or stem before number
            identity = img.parent.name if img.parent != self.root_path else img.stem.split("_")[0]
            self._items.append((identity, img, ["calfw", "cross_age"]))

    def __iter__(self) -> Iterator[tuple[str, Path, list[str]]]:
        for identity, img_path, tags in self._items:
            yield (identity, img_path, tags)

    def __len__(self) -> int:
        return len(self._items)
