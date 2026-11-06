# ClassSight College Demo Runbook

1. Start: `python scripts/demo.py up`, then open `http://localhost:3000` and sign in as `teacher` / `teacher123`.
2. Select the assigned class and subject. Use **Quick Class Enrollment**, enable consent, capture or upload a group photo, review numbered face boxes, enter each name/roll, and confirm.
3. Capture attendance. AUTO records are pre-filled present; REVIEW remains an absent candidate until faculty confirms; UNKNOWN can be assigned or ignored.
4. Review the counts and submit the faculty review action. Only then is the attendance session finalized.
5. To reset demo data: `python scripts/demo.py reset`; repeat it to confirm the second run archives nothing. The SQL backup is written under `runtime-check/backups/` and is ignored by Git.

If the webcam fails, upload a JPG/PNG instead. If a student appears in [REENROL_LIST.md](runtime-check/REENROL_LIST.md), enroll that student again after changing detector/crop settings.
