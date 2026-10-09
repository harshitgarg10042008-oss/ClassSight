-- V8: Demo Seed Data for Timetable Module
-- Creates one term (Oct–Dec 2026), 3 teachers, 30 demo students, a weekly timetable,
-- one teacher on leave, and sample class_sessions for today.
-- All inserts are idempotent (INSERT ... ON CONFLICT DO NOTHING).

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Extra teachers (teacher2, teacher3)  — teacher1 already seeded by DataSeeder
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO public.users (created_at, email, enabled, full_name, password, role, updated_at, username)
VALUES
  (now(), 'teacher2@classsight.edu', TRUE, 'Alice Johnson',
   '$2a$10$SwDIrIclOi9c3c6rMIUDOe7wGoUMmT0eHfccCUxCsM1ddWXQzAVui',  -- password: teacher123
   'TEACHER', now(), 'teacher2'),
  (now(), 'teacher3@classsight.edu', TRUE, 'Bob Williams',
   '$2a$10$SwDIrIclOi9c3c6rMIUDOe7wGoUMmT0eHfccCUxCsM1ddWXQzAVui',  -- password: teacher123
   'TEACHER', now(), 'teacher3')
ON CONFLICT (username) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Additional subject: MATH101
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO public.subjects (active, code, created_at, description, name, updated_at)
VALUES (TRUE, 'MATH101', now(), 'Engineering Mathematics I', 'Mathematics I', now())
ON CONFLICT (code) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Active academic term: Oct–Dec 2026
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO public.academic_terms (name, start_date, end_date, active, created_at, updated_at)
VALUES ('Even Sem 2026-27', '2026-10-01', '2026-12-31', TRUE, now(), now())
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. 30 demo students in class section CS-2026-A  (no face photos needed)
--    Roll numbers: DEMO001–DEMO030
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  sec_id BIGINT;
  i      INT;
BEGIN
  SELECT id INTO sec_id FROM public.class_sections WHERE name = 'CS-2026-A' LIMIT 1;
  IF sec_id IS NULL THEN RETURN; END IF;

  FOR i IN 1..30 LOOP
    INSERT INTO public.students
      (active, created_at, first_name, last_name, roll_number, class_section_id, updated_at)
    VALUES
      (TRUE, now(),
       'Demo' || LPAD(i::TEXT, 2, '0'),
       'Student',
       'DEMO' || LPAD(i::TEXT, 3, '0'),
       sec_id,
       now())
    ON CONFLICT (roll_number) DO NOTHING;

    -- enroll each demo student in CS101 under CS-2026-A
    INSERT INTO public.student_enrollments
      (student_id, class_section_id, subject_id, active, created_at, updated_at)
    SELECT s.id, sec_id, sub.id, TRUE, now(), now()
    FROM   public.students s, public.subjects sub
    WHERE  s.roll_number = 'DEMO' || LPAD(i::TEXT, 3, '0')
      AND  sub.code = 'CS101'
    ON CONFLICT (student_id, class_section_id, subject_id) DO NOTHING;

    -- also enroll in MATH101
    INSERT INTO public.student_enrollments
      (student_id, class_section_id, subject_id, active, created_at, updated_at)
    SELECT s.id, sec_id, sub.id, TRUE, now(), now()
    FROM   public.students s, public.subjects sub
    WHERE  s.roll_number = 'DEMO' || LPAD(i::TEXT, 3, '0')
      AND  sub.code = 'MATH101'
    ON CONFLICT (student_id, class_section_id, subject_id) DO NOTHING;
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Weekly timetable slots for the active term
--    day_of_week: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
--    teacher  = teacher (seeded user, username='teacher')
--    teacher2 = Alice Johnson
--    teacher3 = Bob Williams
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  term_id  BIGINT;
  sec_id   BIGINT;
  cs101_id BIGINT;
  math_id  BIGINT;
  t1_id    BIGINT;
  t2_id    BIGINT;
  t3_id    BIGINT;
  room_id  BIGINT;
BEGIN
  SELECT id INTO term_id FROM public.academic_terms WHERE active = TRUE LIMIT 1;
  SELECT id INTO sec_id   FROM public.class_sections  WHERE name = 'CS-2026-A'   LIMIT 1;
  SELECT id INTO cs101_id FROM public.subjects        WHERE code = 'CS101'        LIMIT 1;
  SELECT id INTO math_id  FROM public.subjects        WHERE code = 'MATH101'      LIMIT 1;
  SELECT id INTO t1_id    FROM public.users           WHERE username = 'teacher'  LIMIT 1;
  SELECT id INTO t2_id    FROM public.users           WHERE username = 'teacher2' LIMIT 1;
  SELECT id INTO t3_id    FROM public.users           WHERE username = 'teacher3' LIMIT 1;
  SELECT id INTO room_id  FROM public.rooms           WHERE name = 'Room 101'     LIMIT 1;

  IF term_id IS NULL OR sec_id IS NULL OR cs101_id IS NULL OR room_id IS NULL THEN
    RAISE NOTICE 'Prerequisite data missing; skipping timetable slot seed';
    RETURN;
  END IF;

  -- CS101: Mon/Wed/Fri 09:00-10:00 (teacher1)
  INSERT INTO public.timetable_slots
    (term_id, day_of_week, start_time, end_time, subject_id, class_section_id, teacher_id, room_id, active, created_at)
  VALUES
    (term_id, 1, '09:00', '10:00', cs101_id, sec_id, t1_id, room_id, TRUE, now()),
    (term_id, 3, '09:00', '10:00', cs101_id, sec_id, t1_id, room_id, TRUE, now()),
    (term_id, 5, '09:00', '10:00', cs101_id, sec_id, t1_id, room_id, TRUE, now())
  ON CONFLICT DO NOTHING;

  -- MATH101: Tue/Thu 10:00-11:00 (teacher2, if available)
  IF math_id IS NOT NULL AND t2_id IS NOT NULL THEN
    INSERT INTO public.timetable_slots
      (term_id, day_of_week, start_time, end_time, subject_id, class_section_id, teacher_id, room_id, active, created_at)
    VALUES
      (term_id, 2, '10:00', '11:00', math_id, sec_id, t2_id, room_id, TRUE, now()),
      (term_id, 4, '10:00', '11:00', math_id, sec_id, t2_id, room_id, TRUE, now())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Generate class_sessions for the current week (Mon–Fri)
--    so the demo works without running the scheduler
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  slot    RECORD;
  slot_date DATE;
  week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;  -- Monday this week
BEGIN
  FOR slot IN
    SELECT ts.*, u.id AS teacher_user_id
    FROM   public.timetable_slots ts
    JOIN   public.academic_terms  at ON at.id = ts.term_id AND at.active = TRUE
    JOIN   public.users            u  ON u.id = ts.teacher_id
    WHERE  ts.active = TRUE
  LOOP
    slot_date := week_start + (slot.day_of_week - 1);  -- day_of_week 1=Mon = offset 0

    -- skip if holiday
    IF EXISTS (SELECT 1 FROM public.holidays h
               WHERE h.date = slot_date AND (h.term_id = slot.term_id OR h.term_id IS NULL)) THEN
      CONTINUE;
    END IF;

    -- skip weekends (shouldn't happen with day_of_week 1-5 but guard anyway)
    IF EXTRACT(DOW FROM slot_date) IN (0, 6) THEN CONTINUE; END IF;

    INSERT INTO public.class_sessions
      (slot_id, date, start_time, end_time, subject_id, class_section_id, teacher_id, room_id,
       status, type, created_at, updated_at)
    VALUES
      (slot.id, slot_date, slot.start_time, slot.end_time, slot.subject_id, slot.class_section_id,
       slot.teacher_id, slot.room_id, 'SCHEDULED', 'REGULAR', now(), now())
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Teacher 3 (Bob Williams) on leave today — marks sessions CANCELLED
--    (creates a leave record; the Spring job will propagate status)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO public.teacher_leaves (teacher_id, from_date, to_date, reason, approved, created_at, updated_at)
SELECT u.id, CURRENT_DATE, CURRENT_DATE, 'Demo: teacher on leave for demonstration', TRUE, now(), now()
FROM   public.users u
WHERE  u.username = 'teacher3'
ON CONFLICT DO NOTHING;
