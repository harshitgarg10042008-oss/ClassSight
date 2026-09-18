# SFace migration note

Switching to OpenCV SFace invalidates all existing enrolments. Every student must be re-enrolled through the new `/enroll` endpoint before the new recognition path can identify them.

This is a model incompatibility change: the legacy FaceNet embeddings in `students.face_embedding` and `student_face_embeddings.embedding` are mathematically different from the OpenCV SFace embeddings produced by the Java pipeline. The old FaceNet columns remain in place and are left untouched until the new SFace pipeline is verified end-to-end.

The original FastAPI service remains available during the verification period, and the new SFace storage and recognition path is intentionally gated behind the Phase 1 feature flag so it can be compared side-by-side with the legacy pipeline.
