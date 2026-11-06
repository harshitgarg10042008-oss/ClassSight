# API surface

The backend exposes authentication at `/auth`, rooms and cameras under `/api/rooms` and `/api/cameras`, faculty assignments at `/teacher/assignments`, group enrollment helpers under `/students` including `/students/quick-detect`, `/students/enroll-single`, and `/students/classes/{id}/replace`, attendance capture at `/capture`, and review at `/api/attendance-sessions/{id}/review`.

The face service exposes `/health`, `/detect-faces`, `/recognize`, and enrollment/embedding endpoints used by Spring Boot.
