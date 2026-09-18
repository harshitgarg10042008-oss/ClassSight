# Phase 1 OpenCV SFace model assets

This directory is the expected model root for the Java-side OpenCV SFace pipeline.

Required files:

- face_detection_yunet_2023mar.onnx
- face_recognition_sface_2021dec.onnx

These should be placed under this folder or under the configured `classsight.phase1.model-dir` directory.

Source:

- YuNet: official OpenCV AI model zoo / OpenCV face detection models
- SFace: official OpenCV face recognition models

License:

- These are upstream OpenCV model assets and should be used under the corresponding OpenCV model-zoo licensing terms. They are not bundled in this repository because they are binary model files and are expected to be downloaded separately.

The Spring Boot application fails fast at startup if either file is missing so the migration fails loudly rather than silently using the wrong embedding model.
