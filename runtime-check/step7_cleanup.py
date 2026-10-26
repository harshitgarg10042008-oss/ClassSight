#!/usr/bin/env python3
import subprocess

cleanup_sql = """
DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM attendance_sessions WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%'));
DELETE FROM attendance_sessions WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%');
DELETE FROM student_face_embeddings WHERE student_id IN (SELECT id FROM students WHERE roll_number LIKE 'RTC_%');
DELETE FROM student_enrollments WHERE student_id IN (SELECT id FROM students WHERE roll_number LIKE 'RTC_%');
DELETE FROM students WHERE roll_number LIKE 'RTC_%';
DELETE FROM faculty_subject_assignments WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%');
DELETE FROM timetable_slots WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%');
DELETE FROM class_sections WHERE name LIKE 'RTC_%';
"""

res = subprocess.run(
    ["docker", "exec", "classsight-postgres-1", "psql", "-U", "classsight", "-d", "classsight", "-c", cleanup_sql],
    capture_output=True, text=True
)
print("Cleanup result:", res.stdout if res.returncode == 0 else res.stderr)
