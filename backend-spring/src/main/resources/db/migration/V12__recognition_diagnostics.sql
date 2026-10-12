ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS recognition_diagnostics TEXT;

ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS recognition_timings TEXT;
