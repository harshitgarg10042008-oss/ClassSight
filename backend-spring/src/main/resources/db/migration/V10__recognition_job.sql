CREATE TABLE recognition_job (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL UNIQUE REFERENCES attendance_sessions(id),
    object_key VARCHAR(1024) NOT NULL,
    status VARCHAR(32) NOT NULL,
    error_message VARCHAR(2000),
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_recognition_job_status ON recognition_job(status);
