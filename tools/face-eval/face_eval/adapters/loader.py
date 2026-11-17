"""face_eval/adapters/loader.py

Factory function to instantiate recognizer adapters according to config entries.
"""
from __future__ import annotations

import logging
from typing import Any

from face_eval.interfaces import RecognizerAdapter

logger = logging.getLogger("face_eval.adapters")


def load_recognizer(config_entry: dict[str, Any]) -> RecognizerAdapter | None:
    """Instantiate a RecognizerAdapter based on its configuration entry.

    Parameters
    ----------
    config_entry : dict
        Contains 'id' (e.g. 'R0'), 'name', and 'enabled'.

    Returns
    -------
    RecognizerAdapter or None if disabled or if dependencies are missing.
    """
    rec_id = config_entry.get("id", "").strip().upper()
    name = config_entry.get("name", rec_id)
    enabled = config_entry.get("enabled", True)

    if not enabled:
        logger.info("Recognizer %s (%s) is disabled in config.", rec_id, name)
        return None

    try:
        if rec_id == "R0":
            from face_eval.adapters.r0_baseline import R0BaselineRecognizer
            return R0BaselineRecognizer()

        elif rec_id == "R1":
            from face_eval.adapters.r1_facenet_cosine import R1FaceNetCosineRecognizer
            return R1FaceNetCosineRecognizer()

        elif rec_id == "R2":
            from face_eval.adapters.r2_facenet_l1 import R2FaceNetL1Recognizer
            return R2FaceNetL1Recognizer()

        elif rec_id == "R3":
            from face_eval.adapters.r3_insightface import R3InsightFaceRecognizer
            return R3InsightFaceRecognizer()

        elif rec_id == "R4":
            logger.warning("R4 (AdaFace) not yet implemented / available. Skipping.")
            return None

        elif rec_id == "R5":
            from face_eval.adapters.r5_sface import R5SFaceRecognizer
            return R5SFaceRecognizer()

        else:
            logger.warning("Unknown recognizer ID: %s. Skipping.", rec_id)
            return None

    except (ImportError, FileNotFoundError, Exception) as exc:
        logger.warning(
            "Could not load recognizer %s (%s): %s",
            rec_id, name, exc
        )
        return None
