"""
Step 7: Cleanup - Remove all RTC_ prefixed test data created during runtime verification.

This removes (in dependency order):
1. attendance_records for RTC sessions (58-65)
2. attendance_sessions for class_section_id=2 (58-65)
3. student_face_embeddings for students 2-31
4. student_enrollments for class_section_id=2
5. students with roll_number LIKE 'RTC_%' (IDs 2-31)
6. class_sections id=2 (RTC_SEC_A)
7. class_assignments for class_section_id=2
8. Multishot session 67 (REVIEW_REQUIRED, section 1, created by test_multishot_e2e.py)

Preserves:
- Student TEST001 (ID 1) and all pre-existing data
- Class section ID 1 (TEST-SEC-A)
- Attendance sessions 66 (FAILED, section 1) - could be left, but clean up
"""
import subprocess
import json

def psql(sql):
    r = subprocess.run(
        ['docker', 'exec', 'classsight-postgres-1', 'psql', '-U', 'classsight', '-d', 'classsight', 
         '-t', '-c', sql],
        capture_output=True, text=True
    )
    return r.stdout.strip(), r.returncode, r.stderr.strip()

def run_cleanup():
    steps = []

    # Verify pre-state
    print("=== Pre-cleanup state ===")
    out, rc, err = psql("SELECT COUNT(*) FROM students WHERE roll_number LIKE 'RTC_%'")
    print(f"RTC_ students before: {out.strip()}")
    out2, _, _ = psql("SELECT COUNT(*) FROM class_sections WHERE id = 2")
    print(f"RTC_SEC_A section before: {out2.strip()}")
    out3, _, _ = psql("SELECT COUNT(*) FROM attendance_sessions WHERE class_section_id = 2")
    print(f"Sessions in section 2 before: {out3.strip()}")
    out4, _, _ = psql("SELECT COUNT(*) FROM student_face_embeddings sfe JOIN student_enrollments se ON sfe.student_id = se.student_id WHERE se.class_section_id = 2")
    print(f"Face embeddings for section 2 students before: {out4.strip()}")

    print("\n=== Executing cleanup ===")

    # Step 7.1: Delete attendance_records for RTC sessions
    sql = "DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM attendance_sessions WHERE class_section_id = 2) RETURNING id"
    out, rc, err = psql(sql)
    n = len([l for l in out.split('\n') if l.strip() and l.strip().isdigit()]) if out else 0
    status = "OK" if rc == 0 else "FAIL"
    print(f"7.1 Delete attendance_records for section 2 sessions: {status} ({out.count(chr(10))+1 if out.strip() else 0} rows)")
    if err: print(f"  ERR: {err[:200]}")
    steps.append({"step": "7.1", "status": status, "sql": sql[:80]})

    # Also delete records for sessions 66,67 (section 1 test sessions)
    sql2 = "DELETE FROM attendance_records WHERE session_id IN (66, 67)"
    out2, rc2, err2 = psql(sql2)
    print(f"7.1b Delete records for sessions 66,67: {'OK' if rc2==0 else 'FAIL'}")

    # Step 7.2: Delete attendance_sessions for section 2
    sql = "DELETE FROM attendance_sessions WHERE class_section_id = 2 RETURNING id"
    out, rc, err = psql(sql)
    status = "OK" if rc == 0 else "FAIL"
    deleted_ids = [l.strip() for l in out.split('\n') if l.strip() and l.strip().lstrip('-').isdigit()] if out else []
    print(f"7.2 Delete attendance_sessions (section 2): {status} ({len(deleted_ids)} sessions deleted)")
    if err: print(f"  ERR: {err[:200]}")
    steps.append({"step": "7.2", "status": status})

    # Also delete sessions 66, 67 (section 1 test sessions created by tests)
    sql2 = "DELETE FROM attendance_sessions WHERE id IN (66, 67)"
    out2, rc2, err2 = psql(sql2)
    print(f"7.2b Delete test sessions 66,67: {'OK' if rc2==0 else 'FAIL'}")

    # Step 7.3: Delete student_face_embeddings for RTC_ students
    sql = "DELETE FROM student_face_embeddings WHERE student_id IN (SELECT id FROM students WHERE roll_number LIKE 'RTC_%') RETURNING id"
    out, rc, err = psql(sql)
    status = "OK" if rc == 0 else "FAIL"
    print(f"7.3 Delete student_face_embeddings: {status}")
    if err: print(f"  ERR: {err[:200]}")
    steps.append({"step": "7.3", "status": status})

    # Step 7.4: Delete student_enrollments for section 2
    sql = "DELETE FROM student_enrollments WHERE class_section_id = 2 RETURNING id"
    out, rc, err = psql(sql)
    status = "OK" if rc == 0 else "FAIL"
    print(f"7.4 Delete student_enrollments (section 2): {status}")
    if err: print(f"  ERR: {err[:200]}")
    steps.append({"step": "7.4", "status": status})

    # Step 7.5: Delete students with RTC_ roll numbers
    sql = "DELETE FROM students WHERE roll_number LIKE 'RTC_%' RETURNING id, roll_number"
    out, rc, err = psql(sql)
    status = "OK" if rc == 0 else "FAIL"
    count = out.count('\n') + 1 if out.strip() else 0
    print(f"7.5 Delete students (RTC_%): {status} (~{count} deleted)")
    if err: print(f"  ERR: {err[:200]}")
    steps.append({"step": "7.5", "status": status})

    # Step 7.6: Delete class_assignments for section 2
    sql = "DELETE FROM class_assignments WHERE class_section_id = 2 RETURNING id"
    out, rc, err = psql(sql)
    status = "OK" if rc == 0 else "FAIL"
    print(f"7.6 Delete class_assignments (section 2): {status}")
    if err and 'does not exist' not in err: print(f"  ERR: {err[:200]}")
    steps.append({"step": "7.6", "status": status if 'does not exist' not in err else "SKIP-no-table"})

    # Step 7.7: Delete class_section id=2
    sql = "DELETE FROM class_sections WHERE id = 2 RETURNING id, name"
    out, rc, err = psql(sql)
    status = "OK" if rc == 0 else "FAIL"
    print(f"7.7 Delete class_sections id=2 (RTC_SEC_A): {status} ({out.strip()})")
    if err: print(f"  ERR: {err[:200]}")
    steps.append({"step": "7.7", "status": status})

    # Also clean up the face service enrollment for RTC_ students
    # (face-service maintains no persistent state between requests, so no cleanup needed there)

    # Step 7.8: Clean up multishot session 67 (should already be gone, but just in case)
    out_check, _, _ = psql("SELECT COUNT(*) FROM attendance_sessions WHERE id = 67")
    if out_check.strip() and int(out_check.strip()) > 0:
        sql = "DELETE FROM attendance_sessions WHERE id = 67"
        out, rc, err = psql(sql)
        print(f"7.8 Delete multishot session 67: {'OK' if rc==0 else 'FAIL'}")
    else:
        print("7.8 Multishot session 67: already gone, skipping")
    steps.append({"step": "7.8", "status": "OK"})

    # Verify post-state
    print("\n=== Post-cleanup state ===")
    out, _, _ = psql("SELECT COUNT(*) FROM students WHERE roll_number LIKE 'RTC_%'")
    print(f"RTC_ students after: {out.strip()} (expected 0)")
    out2, _, _ = psql("SELECT COUNT(*) FROM class_sections WHERE id = 2")
    print(f"RTC_SEC_A section after: {out2.strip()} (expected 0)")
    out3, _, _ = psql("SELECT COUNT(*) FROM students WHERE id = 1")
    print(f"TEST001 student (id=1) still present: {out3.strip()} (expected 1)")
    out4, _, _ = psql("SELECT COUNT(*) FROM class_sections WHERE id = 1")
    print(f"TEST-SEC-A section (id=1) still present: {out4.strip()} (expected 1)")

    # Save results
    results = {
        "steps": steps,
        "post_state": {
            "rtc_students_remaining": out.strip(),
            "rtc_sec_a_remaining": out2.strip(),
            "test001_preserved": out3.strip(),
            "test_sec_a_preserved": out4.strip(),
        }
    }
    import os
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "step7_results.json")
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults written to {out_path}")
    return results

if __name__ == "__main__":
    run_cleanup()
