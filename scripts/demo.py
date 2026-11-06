#!/usr/bin/env python3
"""Cross-platform ClassSight demo lifecycle helper."""

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKUP_DIR = ROOT / "runtime-check" / "backups"


def run(command, *, capture=False):
    return subprocess.run(command, cwd=ROOT, check=True, text=True, capture_output=capture)


def compose(*args):
    run(["docker", "compose", *args])


def status():
    compose("ps")


def up():
    compose("up", "--build", "-d")
    for url in ("http://localhost:8000/health", "http://localhost:8080/actuator/health"):
        print(f"Health endpoint: {url}")
    print("Demo login: teacher / teacher123")
    print("Frontend marketing: http://localhost:3000")
    print("Frontend workspace: http://localhost:3000/app")


def reset():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    dump = BACKUP_DIR / "demo-reset.sql"
    with dump.open("w", encoding="utf-8") as handle:
        subprocess.run(
            ["docker", "compose", "exec", "-T", "postgres", "pg_dump", "-U", "classsight", "-d", "classsight"],
            cwd=ROOT, check=True, text=True, stdout=handle,
        )
    sql = r"""
BEGIN;
CREATE TEMP TABLE demo_sessions ON COMMIT DROP AS
 SELECT id FROM attendance_sessions
 WHERE class_section_id IN (SELECT id FROM class_sections WHERE name LIKE 'RTC_%')
    OR capture_fingerprint LIKE 'RTC_%';
DELETE FROM attendance_override_audit WHERE session_id IN (SELECT id FROM demo_sessions);
DELETE FROM erp_sync_records WHERE session_id IN (SELECT id FROM demo_sessions);
DELETE FROM late_capture_audit WHERE attendance_session_id IN (SELECT id FROM demo_sessions);
DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM demo_sessions)
 OR student_id IN (SELECT id FROM students WHERE roll_number LIKE 'RTC_%' OR roll_number LIKE 'DEMO_%');
DELETE FROM attendance_sessions WHERE id IN (SELECT id FROM demo_sessions);
DELETE FROM student_enrollments WHERE student_id IN
 (SELECT id FROM students WHERE roll_number LIKE 'RTC_%' OR roll_number LIKE 'DEMO_%');
DELETE FROM students WHERE roll_number LIKE 'RTC_%' OR roll_number LIKE 'DEMO_%';
DELETE FROM faculty_subject_assignments WHERE class_section_id IN
 (SELECT id FROM class_sections WHERE name LIKE 'RTC_%');
DELETE FROM class_sections WHERE name LIKE 'RTC_%';
COMMIT;
"""
    result = subprocess.run(
        ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", "classsight",
         "-d", "classsight", "-v", "ON_ERROR_STOP=1", "-c", sql],
        cwd=ROOT, check=True, text=True, capture_output=True,
    )
    print(result.stdout.strip() or "No demo records needed archiving.")


def seed():
    print("Demo seed uses the existing DataSeeder roster and assignments.")
    print("For a fresh class, use Quick Class Enrollment in the faculty UI.")
    print("LFW composite fixtures belong in runtime-check/demo-photos/ when supplied.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("up", "reset", "seed", "status"))
    args = parser.parse_args()
    {"up": up, "reset": reset, "seed": seed, "status": status}[args.command]()


if __name__ == "__main__":
    main()
