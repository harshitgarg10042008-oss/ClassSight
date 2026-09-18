ALTER TABLE students ADD COLUMN IF NOT EXISTS face_embedding_sface DOUBLE PRECISION[];
ALTER TABLE students ADD COLUMN IF NOT EXISTS face_embedding_sface_version VARCHAR(32);

CREATE TABLE IF NOT EXISTS student_face_embeddings_v2 (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    embedding DOUBLE PRECISION[] NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_face_embeddings_v2_student_id
    ON student_face_embeddings_v2(student_id);
