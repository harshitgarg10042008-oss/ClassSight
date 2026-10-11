$ErrorActionPreference = 'Stop'

Write-Host "Removing Demo-* students and related attendance records..."
docker compose exec -T postgres psql -U classsight -d classsight -v ON_ERROR_STOP=1 -c @"
DELETE FROM attendance_records
WHERE student_id IN (SELECT id FROM students WHERE name LIKE 'Demo-%' OR roll_number LIKE 'DEMO-%');
DELETE FROM student_enrollments
WHERE student_id IN (SELECT id FROM students WHERE name LIKE 'Demo-%' OR roll_number LIKE 'DEMO-%');
DELETE FROM students WHERE name LIKE 'Demo-%' OR roll_number LIKE 'DEMO-%';
"@

Write-Host "Demo roster reset. Existing non-demo students and finalized attendance were not changed."
