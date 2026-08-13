ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS capture_fingerprint VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_capture_fingerprint
    ON attendance_sessions(capture_fingerprint);
