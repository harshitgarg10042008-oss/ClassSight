-- Store explicit faculty acknowledgment when unknown detections are ignored or assigned.
ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS unknown_faces_reviewed BOOLEAN NOT NULL DEFAULT FALSE;
