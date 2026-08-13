-- Status constraints verified from the live schema during the Flyway backfill.
-- The baseline already contains these checks for fresh databases; this migration
-- is intentionally idempotent so it documents the previously manual constraint
-- hardening without changing production status semantics.
DO $$
BEGIN
    IF to_regclass('public.cameras') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cameras_status_check'
    ) THEN
        ALTER TABLE cameras ADD CONSTRAINT cameras_status_check CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE','ONLINE','OFFLINE'));
    END IF;
    IF to_regclass('public.attendance_sessions') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'attendance_sessions_status_check'
    ) THEN
        ALTER TABLE attendance_sessions ADD CONSTRAINT attendance_sessions_status_check CHECK (status IN ('OPEN','CAPTURED','PROCESSING','REVIEW_REQUIRED','FINALIZED','FAILED','CANCELLED'));
    END IF;
END $$;
