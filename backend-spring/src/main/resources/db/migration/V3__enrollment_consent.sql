ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_given boolean NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consented_at timestamp(6) without time zone;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consented_by bigint;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'students_consented_by_fk'
    ) THEN
        ALTER TABLE students ADD CONSTRAINT students_consented_by_fk FOREIGN KEY (consented_by) REFERENCES users(id);
    END IF;
END $$;
