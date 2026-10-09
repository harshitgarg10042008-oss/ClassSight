# ClassSight — 5-Minute Demo Guide (Operator Cheat Sheet)

> **Read this top-to-bottom before the demo. Keep this file open during the demo.**

---

## 0 · Pre-Demo Checklist (do at home, night before)

| # | Check | Command / Action |
|---|-------|-----------------|
| 1 | Docker Desktop running | Taskbar tray — whale icon must be green |
| 2 | All services healthy | `docker compose ps` → all containers `Up (healthy)` |
| 3 | DB seeded (Room 101, CS101) | Log in at `http://localhost:3000` → "Select" step shows Room 101 |
| 4 | At least 5 students enrolled | Enrollment tab → roster shows ≥ 5 rows with "128-d Registered" |
| 5 | Frontend accessible | `http://localhost:3000` loads ClassSight page |
| 6 | Take a test attendance photo | Go through the full flow once — verify you see PRESENT/ABSENT |

---

## 1 · Starting All Services

```powershell
# In ClassSight repo root (run once)
docker compose up -d

# Wait ~90 seconds then verify:
docker compose ps
# All 5 containers must show: Up (healthy)
# postgres, rabbitmq, minio, face-service-fastapi, backend-spring
```

```powershell
# Start the Next.js frontend (separate terminal)
cd frontend-next
npm run dev
# Open: http://localhost:3000
```

---

## 2 · Demo Roles & Credentials

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| **Teacher (Primary)** | `teacher` | `teacher123` | Main faculty attendance, period auto-selection, review |
| **Teacher 2 (Leave Demo)** | `teacher2` | `teacher123` | Demonstrates faculty on approved leave / substitution |
| **Teacher 3 (Substitute)** | `teacher3` | `teacher123` | Assigned as substitute teacher for class sessions |
| **HOD / Admin** | `admin` | `admin123` | Approves leave, assigns substitute, views daily dashboard |
| **Student** | `DEMO001` (or student user) | `password123` | Read-only attendance summary, timetable, disputes |

---

## 3 · Comprehensive Live Demo Script (4 Scenarios)

### Scenario 1: Full-Class Attendance (All Students Present)
1. Log in at `http://localhost:3000` as `teacher` (`teacher123`).
2. Navigate to **"Take Attendance"**.
3. Point webcam to full group of students. Click **"Snap Attendance Photo"** → **"Submit Capture & Recognize"**.
4. **Observe:**
   - Vectorized Hungarian matching matches all students in ~1.4s.
   - All student cards show **PRESENT** (green badge).
   - If zero ambiguous faces/warnings, the session **auto-finalizes** instantly to `FINALIZED`.

### Scenario 2: Absent Student Detection & Verification
1. Ask 3–5 students to step out of the camera view.
2. Click **"Retake / New Capture"** and snap a new photo of the remaining students.
3. Submit capture.
4. **Observe:**
   - Detected students show **PRESENT** (green).
   - Students who stepped out are automatically detected and marked **ABSENT** (red badge).
   - Denominator and attended counts update automatically without manual data entry.

### Scenario 3: Timetable Module & Auto-Period Selection
1. Return to the top of the **Take Attendance** tab (or refresh).
2. **Observe:**
   - The **Current Period Banner** automatically queries `/api/timetable/current-period`.
   - The active period (e.g. `MATH101` or `CS101` in `Room 101`) is **automatically selected**.
   - The capture window indicator displays:
     - `CAPTURE WINDOW OPEN` if current time is within `[startTime - 5 min, endTime + 15 min grace]`.
   - If outside normal period hours, a prompt requests a "Late Capture Reason" before unlocking webcam capture, logging an audit record.
   - Click **"Quick Start Period"** to immediately begin capture without manual dropdown navigation.

### Scenario 4: Teacher Leave, Substitution & Analytics Protection
1. Log in (or switch tab) as `admin` (`admin123`).
2. Open **Admin / HOD Dashboard** (`/api/timetable/dashboard/today`).
3. View **"Teachers on Leave"**:
   - Notice `teacher2` has approved leave scheduled.
   - Associated sessions for `teacher2` are listed with status `CANCELLED` (reason: "Teacher on approved leave").
4. **Assign a Substitute**:
   - For an affected session, select **Assign Substitute** → choose `teacher3`.
   - Status updates from `CANCELLED` to `SUBSTITUTED`.
5. **Verify Analytics Denominator Protection**:
   - Navigate to Analytics (`/api/analytics?subjectId=1&classSectionId=1`).
   - Check the student percentages:
     - Hard rule enforced: Cancelled sessions generate **0 absences** and do **NOT** count towards the lecture denominator.
     - Student attendance percentage remains 100% (or unaffected by cancellations), proving the denominator fix.

---

## 4 · Fallback Scenarios (if something goes wrong)

| Problem | Quick Fix |
|---------|-----------|
| Webcam not accessible | Switch to **"Upload Photo File"** mode — upload a sample classroom image |
| Backend 502 / connection refused | Check `docker compose ps` — run `docker compose restart backend-spring` |
| Recognition returns all UNKNOWN | Check roster on Enrollment tab — verify student embeddings are seeded. |
| Capture outside scheduled period | Enter any late capture note (e.g. "Lab rescheduled") to bypass the capture window |
| Login rejected | Use `admin` / `admin123` or `teacher` / `teacher123` |

---

## 5 · Quick URLs

| Service | URL |
|---------|-----|
| **Frontend Web App** | http://localhost:3000 |
| **Spring Boot API** | http://localhost:8080 |
| **API Health** | http://localhost:8080/health |
| **FastAPI Face Engine** | http://localhost:8000/health |
| **Today's Schedule & HOD Hub** | http://localhost:8080/api/timetable/dashboard/today |
| **MinIO Storage** | http://localhost:9001 (minioadmin / minioadmin) |
| **RabbitMQ Console** | http://localhost:15672 (classsight / classsight_rabbit_password) |

---

*Last updated: 2026-10-09 · Version: Live Demo Readiness Build*
