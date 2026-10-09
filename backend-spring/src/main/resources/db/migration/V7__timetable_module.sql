-- V7: Timetable Module
-- Creates: academic_terms, timetable_slots, class_sessions, holidays
-- Links attendance_sessions to class_sessions via nullable FK
-- All FKs to existing tables are nullable where needed to preserve backward compat

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. academic_terms
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.academic_terms (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP(6) WITHOUT TIME ZONE
);

-- only one active term at a time (partial unique index)
CREATE UNIQUE INDEX academic_terms_active_unique ON public.academic_terms (active) WHERE active = TRUE;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. timetable_slots  (repeating weekly template)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.timetable_slots (
    id                BIGSERIAL PRIMARY KEY,
    term_id           BIGINT       NOT NULL REFERENCES public.academic_terms(id),
    day_of_week       SMALLINT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=MON..7=SUN
    start_time        TIME         NOT NULL,
    end_time          TIME         NOT NULL,
    subject_id        BIGINT       NOT NULL REFERENCES public.subjects(id),
    class_section_id  BIGINT       NOT NULL REFERENCES public.class_sections(id),
    teacher_id        BIGINT       NOT NULL REFERENCES public.users(id),
    room_id           BIGINT       NOT NULL REFERENCES public.rooms(id),
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP(6) WITHOUT TIME ZONE,
    CONSTRAINT timetable_slots_time_order CHECK (end_time > start_time)
);

-- conflict detection indexes: teacher/room/section cannot be double-booked on same day+time in same term
CREATE INDEX ts_teacher_day_idx   ON public.timetable_slots (term_id, teacher_id, day_of_week, start_time, end_time) WHERE active = TRUE;
CREATE INDEX ts_room_day_idx      ON public.timetable_slots (term_id, room_id, day_of_week, start_time, end_time)    WHERE active = TRUE;
CREATE INDEX ts_section_day_idx   ON public.timetable_slots (term_id, class_section_id, day_of_week, start_time, end_time) WHERE active = TRUE;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. holidays
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.holidays (
    id         BIGSERIAL PRIMARY KEY,
    term_id    BIGINT       REFERENCES public.academic_terms(id),
    date       DATE         NOT NULL,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX holidays_term_date_unique ON public.holidays (COALESCE(term_id, 0), date);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. class_sessions  (daily materialised instances from slots)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.class_sessions (
    id                      BIGSERIAL PRIMARY KEY,
    slot_id                 BIGINT       REFERENCES public.timetable_slots(id),        -- null for extra/makeup classes
    date                    DATE         NOT NULL,
    start_time              TIME         NOT NULL,
    end_time                TIME         NOT NULL,
    subject_id              BIGINT       NOT NULL REFERENCES public.subjects(id),
    class_section_id        BIGINT       NOT NULL REFERENCES public.class_sections(id),
    teacher_id              BIGINT       NOT NULL REFERENCES public.users(id),
    room_id                 BIGINT       NOT NULL REFERENCES public.rooms(id),
    substitute_teacher_id   BIGINT       REFERENCES public.users(id),
    status                  VARCHAR(30)  NOT NULL DEFAULT 'SCHEDULED',
    type                    VARCHAR(30)  NOT NULL DEFAULT 'REGULAR',
    reason                  VARCHAR(1000),
    created_by              BIGINT       REFERENCES public.users(id),
    linked_session_id       BIGINT       REFERENCES public.class_sessions(id),         -- for RESCHEDULED chains
    created_at              TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP(6) WITHOUT TIME ZONE,
    CONSTRAINT cs_status_check CHECK (status IN ('SCHEDULED','CONDUCTED','CANCELLED','SUBSTITUTED','RESCHEDULED','MISSED')),
    CONSTRAINT cs_type_check   CHECK (type   IN ('REGULAR','EXTRA','MAKEUP'))
);

CREATE INDEX cs_date_teacher_idx   ON public.class_sessions (date, teacher_id);
CREATE INDEX cs_date_section_idx   ON public.class_sessions (date, class_section_id);
CREATE INDEX cs_slot_date_unique   ON public.class_sessions (slot_id, date) WHERE slot_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Link attendance_sessions → class_sessions (nullable, backward compat)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.attendance_sessions
    ADD COLUMN IF NOT EXISTS class_session_id BIGINT REFERENCES public.class_sessions(id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. teacher_leaves  (date-range leave requests)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.teacher_leaves (
    id          BIGSERIAL PRIMARY KEY,
    teacher_id  BIGINT       NOT NULL REFERENCES public.users(id),
    from_date   DATE         NOT NULL,
    to_date     DATE         NOT NULL,
    reason      VARCHAR(1000),
    approved    BOOLEAN      NOT NULL DEFAULT FALSE,
    approved_by BIGINT       REFERENCES public.users(id),
    created_at  TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP(6) WITHOUT TIME ZONE,
    CONSTRAINT teacher_leaves_date_order CHECK (to_date >= from_date)
);

CREATE INDEX teacher_leaves_teacher_idx ON public.teacher_leaves (teacher_id, from_date, to_date);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. student_enrollments (section/subject roster, supports lab batches)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.student_enrollments (
    id               BIGSERIAL PRIMARY KEY,
    student_id       BIGINT      NOT NULL REFERENCES public.students(id),
    class_section_id BIGINT      NOT NULL REFERENCES public.class_sections(id),
    subject_id       BIGINT      REFERENCES public.subjects(id),   -- null = enrolled in all subjects of section
    batch_group      VARCHAR(50),                                   -- e.g. "LAB-A", "ELEC-B"
    active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP(6) WITHOUT TIME ZONE,
    UNIQUE (student_id, class_section_id, subject_id)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. late_capture_audit  (tracks out-of-window captures with reason)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.late_capture_audit (
    id                  BIGSERIAL PRIMARY KEY,
    attendance_session_id BIGINT   NOT NULL REFERENCES public.attendance_sessions(id),
    captured_at         TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    expected_window_end TIMESTAMP(6) WITHOUT TIME ZONE,
    reason              VARCHAR(1000) NOT NULL,
    actor               VARCHAR(120)  NOT NULL,
    created_at          TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT now()
);
