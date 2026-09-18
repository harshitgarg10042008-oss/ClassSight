ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS quality_warning VARCHAR(2000);
