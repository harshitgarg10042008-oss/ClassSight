-- Move legacy direct section memberships into the explicit class/subject roster.
INSERT INTO student_enrollments (student_id, class_section_id, subject_id, active, created_at)
SELECT s.id, s.class_section_id, NULL, TRUE, COALESCE(s.created_at, now())
FROM students s
WHERE s.class_section_id IS NOT NULL
  AND s.active = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM student_enrollments e
      WHERE e.student_id = s.id AND e.class_section_id = s.class_section_id
        AND e.subject_id IS NULL AND e.active = TRUE
  );

-- Retain referential history while removing the nameless test artifact from active use.
UPDATE students
SET active = FALSE,
    first_name = CASE WHEN NULLIF(BTRIM(first_name), '') IS NULL THEN 'Archived' ELSE first_name END,
    last_name = CASE WHEN NULLIF(BTRIM(last_name), '') IS NULL THEN 'Demo record' ELSE last_name END,
    face_embedding = NULL
WHERE UPPER(BTRIM(roll_number)) = 'TEST001';

-- Existing live demo databases may contain other nameless artifacts too. Do not seed any;
-- make them visible and editable rather than allowing blank values to break roster pages.
UPDATE students
SET first_name = 'Needs review', last_name = 'Student'
WHERE NULLIF(BTRIM(first_name), '') IS NULL OR NULLIF(BTRIM(last_name), '') IS NULL;
