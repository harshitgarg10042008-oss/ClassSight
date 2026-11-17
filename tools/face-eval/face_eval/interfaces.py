"""face_eval/interfaces.py

Abstract base classes that every recognizer adapter and dataset adapter must
implement.  Production code is never imported from here.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Iterator

import numpy as np


class RecognizerAdapter(ABC):
    """Interface for a face-embedding + distance back-end."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name, e.g. 'FaceNet-128d-seed42-L1 (Baseline)'."""
        ...

    @property
    @abstractmethod
    def embedding_dim(self) -> int:
        """Dimensionality of the embedding vector returned by embed()."""
        ...

    @property
    @abstractmethod
    def licence_note(self) -> str:
        """One-line licence / legal note for this model's weights."""
        ...

    @abstractmethod
    def embed(self, aligned_face: np.ndarray) -> np.ndarray:
        """Compute a 1-D float32 embedding for a single aligned face image.

        Parameters
        ----------
        aligned_face:
            HxWx3 uint8 numpy array (RGB).  Adapters are responsible for any
            additional resizing / normalisation they require internally.

        Returns
        -------
        np.ndarray
            1-D float32 vector of length self.embedding_dim.
        """
        ...

    @abstractmethod
    def distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """Compute the distance between two embeddings.

        Lower distance == more similar.  The metrics module uses
        ``score = -distance`` internally so that higher score == more similar.

        Parameters
        ----------
        a, b:
            1-D float32 embedding vectors (from embed()).

        Returns
        -------
        float
            Non-negative distance value.
        """
        ...


class DatasetAdapter(ABC):
    """Interface for a face dataset that yields labelled image paths."""

    @abstractmethod
    def __iter__(self) -> Iterator[tuple[str, Path, list[str]]]:
        """Yield (identity, image_path, condition_tags) tuples.

        Fields
        ------
        identity : str
            Unique identifier for the person in this dataset.
        image_path : Path
            Absolute (or repo-relative) path to the image file.
        condition_tags : list[str]
            Zero or more condition labels from the controlled vocabulary:
            normal, beard, no_beard, glasses, no_glasses, low_light,
            far, angled, mask, other.
            LFW/CALFW/CPLFW items typically carry ["lfw"] etc.
        """
        ...

    @abstractmethod
    def __len__(self) -> int:
        """Return the total number of images in the dataset."""
        ...
