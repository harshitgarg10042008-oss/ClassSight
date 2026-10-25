-- Preserve who finalized each class attendance session after faculty review.
ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS finalized_by BIGINT,
    ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP;
