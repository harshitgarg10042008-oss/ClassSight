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

## 2 · Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Teacher / Demo operator | `teacher` | `teacher123` |
| Admin (if needed) | `admin` | `admin123` |

---

## 3 · Bulk Enroll Students (before class starts)

> Do this **5 minutes before** the demo begins.

1. Click **"Student Enrollment"** tab
2. Click **"Download CSV Template"** → save as `students.csv`
3. Fill in real student roll numbers and names (or use the sample 5 rows)
4. Name each photo file `<roll_number>.jpg` (e.g. `2501320100101.jpg`)
5. Upload:
   - **CSV file** → browse to `students.csv`
   - **Photos** → select all `.jpg` files at once (Ctrl+A), OR zip them
6. Click **"Start Bulk Enrollment"**
7. Watch the per-row table — each row turns green ✅ or red ❌ with a diagnostic message
8. Check the **Enrolled Students** roster — all enrolled students show "128-d Registered"

> ⚠️ **If a row fails:** "Multiple faces detected" → retake photo with one face only.
> ⚠️ **If a row fails:** "No face detected" → make sure the face is clearly visible and well-lit.

---

## 4 · Taking Attendance (the live demo moment)

> This is the core demo. Keep it to ~60 seconds.

1. Click **"Take Attendance"** tab
2. **Step 01 — Select:**
   - Room: `Room 101`
   - Subject: `CS101 — Introduction to Computer Science · CS-2026-A`
   - Click **"Continue to Photo Capture"**
3. **Step 02 — Capture:**
   - **Live Webcam** (default): wait for the camera preview to appear
   - Position students in frame → click **"Snap Attendance Photo"**
   - Preview thumbnail appears below
   - Click **"Submit Capture & Recognize"**
4. **Step 03 — Results:**
   - Page polls every 1 second while recognition runs (usually 2–8 seconds)
   - When complete: each student card shows PRESENT ✅ or ABSENT ❌
   - Students not detected in the photo are automatically marked **ABSENT**
   - If any cards need manual override → click Present/Absent buttons → **"Finalize Attendance Session"**
   - If zero cards need review → session is **auto-finalized instantly** ✨

---

## 5 · What to Say During the Demo

> Suggested talking points (30 seconds each):

**On login:**
> "Faculty log in with their credentials. Authentication is JWT — tokens stay in memory, never localStorage."

**On enrollment:**
> "Before a class term, the admin bulk-enrolls students with a CSV and photos. The system extracts a 128-dimensional facial embedding using dlib's HOG detector. We store embeddings, never raw photos of students."

**On attendance:**
> "The teacher takes one group photo of the class. Our Spring Boot backend sends it to a FastAPI recognition engine. Each face is matched against enrolled embeddings using Euclidean distance. Students whose faces aren't detected are automatically marked absent — zero manual effort."

**On the results:**
> "Only ambiguous cases bubble up for manual review. Cleanly recognized sessions auto-finalize in under 10 seconds."

---

## 6 · Fallback Scenarios (if something goes wrong)

| Problem | Quick Fix |
|---------|-----------|
| Webcam not accessible | Switch to **"Upload Photo File"** mode — upload a pre-taken photo |
| Backend 502 / connection refused | Check `docker compose ps` — restart stuck container: `docker compose restart backend-spring` |
| Recognition returns all UNKNOWN | Verify students are enrolled (roster shows "128-d Registered"). Try with good lighting and closer photo |
| Face service timeout | Photo may be too large — resize to < 2 MB before submitting |
| Login rejected | Try `admin` / `admin123` as fallback credentials |
| DB empty (no rooms/subjects) | Run `docker compose restart backend-spring` — DataSeeder runs on startup |

---

## 7 · Recognition Performance Tips

- **Optimal distance from camera:** 2–4 metres (not more than 6m)
- **Lighting:** even, frontal — avoid strong backlighting from windows
- **Number of students in frame:** system handles 30+ enrolled; **demo group in camera: 8–12** works best
- **Photo quality:** any modern smartphone or webcam at 720p+ is sufficient
- **Edge crop mode** (better accuracy for wide shots): set `EDGE_CROP_ENABLED=true` in `docker-compose.yml` for next restart

---

## 8 · Stopping Services

```powershell
docker compose down
# Or keep DB persistent and only stop app containers:
docker compose stop backend-spring face-service-fastapi frontend-next
```

---

## Quick URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8080 |
| **API Health** | http://localhost:8080/health |
| **Face Service** | http://localhost:8000 |
| **Face Health** | http://localhost:8000/health |
| **MinIO Console** | http://localhost:9001 (admin: minioadmin / minioadmin) |
| **RabbitMQ Console** | http://localhost:15672 (classsight / classsight_rabbit_password) |

---

*Last updated: 2026-09-20 · Version: Demo-Day P0 build*
