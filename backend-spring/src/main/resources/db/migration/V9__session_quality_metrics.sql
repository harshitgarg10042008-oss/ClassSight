ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS blur_score DOUBLE PRECISION;

ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS brightness_mean DOUBLE PRECISION;

ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS liveness_score DOUBLE PRECISION;

ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS quality_passed BOOLEAN;

ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS quality_warning VARCHAR(2000);
