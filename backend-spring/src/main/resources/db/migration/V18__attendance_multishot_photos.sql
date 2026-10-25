-- Store private object keys for additional shots in the same attendance session.
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS captured_photo_paths TEXT;
