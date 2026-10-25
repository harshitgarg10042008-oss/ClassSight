-- Store the opaque key for the consented roster thumbnail in configured private storage.
ALTER TABLE students ADD COLUMN IF NOT EXISTS face_photo_path TEXT;
