ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS face_size_ratio DOUBLE PRECISION;
