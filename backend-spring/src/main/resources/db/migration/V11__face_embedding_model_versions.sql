ALTER TABLE student_face_embeddings
    ADD COLUMN IF NOT EXISTS model_version VARCHAR(100);

UPDATE student_face_embeddings
SET model_version = 'face-recognition-small-v1'
WHERE model_version IS NULL;

ALTER TABLE student_face_embeddings
    ALTER COLUMN model_version SET NOT NULL;
