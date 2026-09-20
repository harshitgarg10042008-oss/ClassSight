# ClassSight — Demo Readiness Log

**Date:** 2026-09-20  
**Target:** Live Classroom Demo (~30 Students)  
**Strategy:** Strict priority tiers (P0 -> P1 -> P2). Implement -> Build -> Test -> Fix -> Repeat.

---

## Progress Tracker

| Item | Description | Status | Verification Evidence |
|---|---|---|---|
| **P0.1** | Seed Data (Room, Subject, Section, Assignment, Browser Camera) | 🟢 Complete | `DataSeeder.java` seeds Room 101, CS101, CS-2026-A, Browser Webcam, and teacher assignment |
| **P0.2** | Bulk Student Enrollment (CSV Template + Photo matching + Single Add) | 🟡 In Progress | Designing CSV format & Next.js UI + Spring bulk endpoint |
| **P0.3** | Live Webcam Capture for Attendance (`getUserMedia` -> Canvas -> /capture) | ⚪ Not Started | |
| **P0.4** | Fix Present/Absent Logic (Missing -> ABSENT/APPROVED, not REVIEW) | 🟢 Complete | Implemented in `AttendanceRecognitionService.java`; verified by `AttendanceRecognitionServiceTest` (8/8 tests pass) |
| **P0.5** | Global CORS Configuration (`SecurityConfig.java`) | 🟢 Complete | `SecurityConfig.java` updated with `CorsConfigurationSource` for `localhost:*` & `127.0.0.1:*` |
| **P0.6** | Multi-Face Recognition Latency (Wire edge-crop & benchmark 30-face photo) | ⚪ Not Started | |
| **P0.7** | Full End-to-End Dry Run (Fresh DB, Bulk Enroll, Webcam Capture, Absent Test) | ⚪ Not Started | |
| **P0.8** | `DEMO_GUIDE.md` (Step-by-step 5-minute pre-demo operator manual) | ⚪ Not Started | |

---

## Execution Log

### Initial Baseline
- Verified stack: Next.js (`frontend-next`), Spring Boot 3.2.0 (`backend-spring`), FastAPI (`face-service-fastapi`), PostgreSQL 15, MinIO, RabbitMQ.
- Maven 3.9.9 and OpenJDK 17 verified on host.
- Node v24.15.0 and Next.js 14 verified on host.
- Both `mvn clean test` (7/7 tests) and `npm run build` pass cleanly on baseline commit.
- Docker Desktop launched to provide container runtime.
