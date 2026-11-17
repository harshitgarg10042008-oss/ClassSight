"""face_eval/datasets/real_dataset.py

Real consented data adapter.
Expects structure:
  eval_data/real/<person_id>/<session_id>/<condition>/*.jpg

Validates:
  - At least 2 sessions for at least 10 people
  - Conditions from controlled vocabulary
Raises ValueError("no real consented data yet") if validation fails.
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterator

from face_eval.interfaces import DatasetAdapter

VALID_CONDITIONS = {
    "normal",
    "beard",
    "no_beard",
    "glasses",
    "no_glasses",
    "low_light",
    "far",
    "angled",
    "mask",
    "other",
}


class RealDataset(DatasetAdapter):
    """Adapter for real consented benchmark dataset."""

    def __init__(
        self,
        path: str | Path = "eval_data/real",
        min_people: int = 10,
        min_sessions: int = 2,
    ) -> None:
        self.root_path = Path(path)
        self.min_people = min_people
        self.min_sessions = min_sessions
        self._items: list[tuple[str, Path, list[str]]] = []

        self._validate_and_load()

    def _validate_and_load(self) -> None:
        if not self.root_path.exists():
            raise ValueError("no real consented data yet: directory does not exist")

        person_dirs = [p for p in self.root_path.iterdir() if p.is_dir()]
        qualified_people = 0

        for p_dir in person_dirs:
            person_id = p_dir.name
            session_dirs = [s for s in p_dir.iterdir() if s.is_dir()]
            valid_sessions_for_person = 0

            for s_dir in session_dirs:
                session_id = s_dir.name
                has_imgs_in_session = False
                for cond_dir in s_dir.iterdir():
                    if cond_dir.is_dir():
                        condition = cond_dir.name.lower()
                        if condition not in VALID_CONDITIONS:
                            continue
                        imgs = sorted(
                            list(cond_dir.glob("*.jpg"))
                            + list(cond_dir.glob("*.jpeg"))
                            + list(cond_dir.glob("*.png"))
                        )
                        for img in imgs:
                            has_imgs_in_session = True
                            self._items.append((person_id, img, [condition, session_id]))
                if has_imgs_in_session:
                    valid_sessions_for_person += 1

            if valid_sessions_for_person >= self.min_sessions:
                qualified_people += 1

        if qualified_people < self.min_people:
            raise ValueError(
                f"no real consented data yet (found {qualified_people} people with >= {self.min_sessions} "
                f"sessions, required at least {self.min_people})"
            )

    def __iter__(self) -> Iterator[tuple[str, Path, list[str]]]:
        for person_id, img_path, tags in self._items:
            yield (person_id, img_path, tags)

    def __len__(self) -> int:
        return len(self._items)
