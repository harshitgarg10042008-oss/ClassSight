import json
import subprocess

query = """
SELECT id, roll_number, name
FROM students
WHERE roll_number NOT LIKE 'RTC_%'
  AND (face_embedding IS NOT NULL OR id IN (SELECT DISTINCT student_id FROM student_face_embeddings));
"""

res = subprocess.run(
    ["docker", "exec", "classsight-postgres-1", "psql", "-U", "classsight", "-d", "classsight", "-c", query],
    capture_output=True, text=True
)
print("Real students with embeddings:")
print(res.stdout)

# Also count students in student_face_embeddings vs students.face_embedding
count_query = """
SELECT 'students.face_embedding' as source, count(*) FROM students WHERE roll_number NOT LIKE 'RTC_%' AND face_embedding IS NOT NULL
UNION ALL
SELECT 'student_face_embeddings', count(DISTINCT student_id) FROM student_face_embeddings WHERE student_id IN (SELECT id FROM students WHERE roll_number NOT LIKE 'RTC_%');
"""
res_counts = subprocess.run(
    ["docker", "exec", "classsight-postgres-1", "psql", "-U", "classsight", "-d", "classsight", "-c", count_query],
    capture_output=True, text=True
)
print("Counts:")
print(res_counts.stdout)
