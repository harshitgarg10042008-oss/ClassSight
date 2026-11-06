#!/usr/bin/env python3
"""Cross-platform development lifecycle commands."""

import argparse
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(command, *, capture=False):
    return subprocess.run(command, cwd=ROOT, check=True, text=True, capture_output=capture)


def compose(*args):
    run(["docker", "compose", *args])


def up():
    compose("up", "--build", "-d")
    print("Frontend: http://localhost:3000")
    print("Backend health: http://localhost:8080/actuator/health")
    print("Face-service health: http://localhost:8000/health")
    print("Development login: teacher / teacher123")


def down():
    compose("down")


def status():
    compose("ps")


def reset():
    backup_dir = ROOT / "runtime-check" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    with (backup_dir / "dev-reset.sql").open("w", encoding="utf-8") as dump:
        subprocess.run(
            ["docker", "compose", "exec", "-T", "postgres", "pg_dump", "-U", "classsight", "-d", "classsight"],
            cwd=ROOT, check=True, text=True, stdout=dump,
        )
    sql = """
BEGIN;
CREATE TEMP TABLE demo_sessions ON COMMIT DROP AS
 SELECT id FROM attendance_sessions
 WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%')
    OR capture_fingerprint LIKE 'RTC_%';
DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM demo_sessions)
 OR student_id IN (SELECT id FROM students WHERE roll_number LIKE 'RTC_%' OR roll_number LIKE 'DEMO_%'
   OR roll_number = 'TEST001' OR roll_number IS NULL OR btrim(roll_number) = '');
DELETE FROM attendance_sessions WHERE id IN (SELECT id FROM demo_sessions);
DELETE FROM student_enrollments WHERE student_id IN
 (SELECT id FROM students WHERE roll_number LIKE 'RTC_%' OR roll_number LIKE 'DEMO_%'
   OR roll_number = 'TEST001' OR roll_number IS NULL OR btrim(roll_number) = '');
UPDATE students SET active = false
 WHERE roll_number LIKE 'RTC_%' OR roll_number LIKE 'DEMO_%'
    OR roll_number = 'TEST001' OR roll_number IS NULL OR btrim(roll_number) = '';
DELETE FROM faculty_subject_assignments WHERE class_section_id IN
 (SELECT id FROM class_sections WHERE name LIKE 'RTC_%');
DELETE FROM class_sections WHERE name LIKE 'RTC_%';
COMMIT;
"""
    result = run([
        "docker", "compose", "exec", "-T", "postgres", "psql", "-U", "classsight",
        "-d", "classsight", "-v", "ON_ERROR_STOP=1", "-c", sql,
    ], capture=True)
    print(result.stdout.strip() or "No demo records needed archiving.")


def seed():
    print("Development seed data is provided by the backend DataSeeder.")


def test():
    run(["python", "-m", "pytest", "face-service-fastapi/tests", "-v"])
    npm = "npm.cmd" if os.name == "nt" else "npm"
    run([npm, "--prefix", "frontend-next", "run", "typecheck"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("up", "down", "status", "reset", "seed", "test"))
    args = parser.parse_args()
    globals()[args.command]()


if __name__ == "__main__":
    main()
