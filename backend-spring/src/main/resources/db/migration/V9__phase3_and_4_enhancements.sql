-- V9: Phase 3 & 4 Enhancements
-- 1. Add HOD to users role check
-- 2. Add must_change_password to users
-- 3. Add capture_phase to attendance_sessions
-- 4. Create attendance_disputes table
-- 5. Create attendance_override_audit table
-- 6. Create student_leaves table (Medical, Duty/OD)
-- 7. Seed HOD user and DEMO student user for testing

-- 1. Update role check constraint on users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'HOD'::character varying, 'TEACHER'::character varying, 'STUDENT'::character varying])::text[])));

-- 2. Add must_change_password to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add capture_phase to attendance_sessions
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS capture_phase VARCHAR(50) DEFAULT 'SINGLE';

-- 4. attendance_disputes
CREATE TABLE IF NOT EXISTS public.attendance_disputes (
    id                   BIGSERIAL PRIMARY KEY,
    student_id           BIGINT NOT NULL REFERENCES public.students(id),
    attendance_record_id BIGINT REFERENCES public.attendance_records(id),
    class_session_id     BIGINT REFERENCES public.class_sessions(id),
    reason               TEXT NOT NULL,
    status               VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    resolution_notes     TEXT,
    resolved_by          BIGINT REFERENCES public.users(id),
    resolved_at          TIMESTAMP(6) WITHOUT TIME ZONE,
    created_at           TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP(6) WITHOUT TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_disputes_student ON public.attendance_disputes(student_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.attendance_disputes(status);

-- 5. attendance_override_audit
CREATE TABLE IF NOT EXISTS public.attendance_override_audit (
    id                   BIGSERIAL PRIMARY KEY,
    session_id           BIGINT REFERENCES public.attendance_sessions(id),
    record_id            BIGINT REFERENCES public.attendance_records(id),
    student_id           BIGINT NOT NULL REFERENCES public.students(id),
    old_status           VARCHAR(50),
    new_status           VARCHAR(50) NOT NULL,
    modified_by          BIGINT REFERENCES public.users(id),
    reason               TEXT,
    created_at           TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_override_student ON public.attendance_override_audit(student_id);

-- 6. student_leaves
CREATE TABLE IF NOT EXISTS public.student_leaves (
    id                   BIGSERIAL PRIMARY KEY,
    student_id           BIGINT NOT NULL REFERENCES public.students(id),
    leave_type           VARCHAR(50) NOT NULL, -- 'MEDICAL', 'DUTY_OD'
    from_date            DATE NOT NULL,
    to_date              DATE NOT NULL,
    reason               TEXT,
    document_url         VARCHAR(255),
    status               VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    approved_by          BIGINT REFERENCES public.users(id),
    created_at           TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP(6) WITHOUT TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_student_leaves_student ON public.student_leaves(student_id);
CREATE INDEX IF NOT EXISTS idx_student_leaves_dates ON public.student_leaves(from_date, to_date);

-- 7. Seed HOD user & DEMO001 student login
INSERT INTO public.users (created_at, email, enabled, full_name, password, role, updated_at, username, must_change_password)
VALUES
  (now(), 'hod@classsight.edu', TRUE, 'Dr. Sarah Connor (HOD)',
   '$2a$10$SwDIrIclOi9c3c6rMIUDOe7wGoUMmT0eHfccCUxCsM1ddWXQzAVui',
   'HOD', now(), 'hod', FALSE)
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.users (created_at, email, enabled, full_name, password, role, updated_at, username, must_change_password)
VALUES
  (now(), 'demo001@classsight.edu', TRUE, 'Demo01 Student',
   '$2a$10$SwDIrIclOi9c3c6rMIUDOe7wGoUMmT0eHfccCUxCsM1ddWXQzAVui',
   'STUDENT', now(), 'DEMO001', FALSE)
ON CONFLICT (username) DO NOTHING;
