ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS recognition_state VARCHAR(32);
