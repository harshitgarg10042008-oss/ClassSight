CREATE TABLE IF NOT EXISTS student_face_embeddings (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    embedding DOUBLE PRECISION[] NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_face_embeddings_student_id
    ON student_face_embeddings(student_id);
