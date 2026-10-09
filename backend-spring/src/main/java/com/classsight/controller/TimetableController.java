package com.classsight.controller;

import com.classsight.entity.*;
import com.classsight.repository.*;
import com.classsight.service.TimetableService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

/**
 * TimetableController — Phase 2 REST API.
 *
 * Base: /api/timetable
 *
 * Teacher endpoints:
 *   GET  /api/timetable/current-period          → auto-detect current/next period
 *   GET  /api/timetable/today                   → today's sessions for the caller
 *
 * Admin endpoints:
 *   POST /api/timetable/sessions/generate       → generate sessions for a date range
 *   GET  /api/timetable/sessions/range          → list sessions in a range
 *   POST /api/timetable/sessions/{id}/cancel    → cancel a session
 *   POST /api/timetable/sessions/{id}/substitute → assign a substitute teacher
 *   GET  /api/timetable/terms                   → list academic terms
 *   POST /api/timetable/terms                   → create a term
 *   POST /api/timetable/leaves                  → mark teacher on leave
 *   GET  /api/timetable/leaves                  → list leave records
 *   PUT  /api/timetable/leaves/{id}/approve     → approve a leave
 */
@RestController
@RequestMapping("/api/timetable")
public class TimetableController {

    private final TimetableService         timetableService;
    private final ClassSessionRepository   sessionRepo;
    private final AcademicTermRepository   termRepo;
    private final TeacherLeaveRepository   leaveRepo;
    private final UserRepository           userRepo;
    private final ClassSectionRepository   sectionRepo;
    private final SubjectRepository        subjectRepo;
    private final RoomRepository           roomRepo;
    private final HolidayRepository        holidayRepo;
    private final TimetableSlotRepository  slotRepo;

    public TimetableController(TimetableService timetableService,
                               ClassSessionRepository sessionRepo,
                               AcademicTermRepository termRepo,
                               TeacherLeaveRepository leaveRepo,
                               UserRepository userRepo,
                               ClassSectionRepository sectionRepo,
                               SubjectRepository subjectRepo,
                               RoomRepository roomRepo,
                               HolidayRepository holidayRepo,
                               TimetableSlotRepository slotRepo) {
        this.timetableService = timetableService;
        this.sessionRepo      = sessionRepo;
        this.termRepo         = termRepo;
        this.leaveRepo        = leaveRepo;
        this.userRepo         = userRepo;
        this.sectionRepo      = sectionRepo;
        this.subjectRepo      = subjectRepo;
        this.roomRepo         = roomRepo;
        this.holidayRepo      = holidayRepo;
        this.slotRepo         = slotRepo;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Teacher: current/next period auto-select
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/timetable/current-period
     *
     * Returns the current or next class session for the authenticated teacher.
     * Also includes capture-window information so the frontend can enable/disable
     * the capture button accordingly.
     *
     * Response: { session, captureAllowed, windowOpen, windowClose }
     */
    @GetMapping("/current-period")
    public ResponseEntity<Map<String, Object>> getCurrentPeriod(
            @AuthenticationPrincipal UserDetails userDetails) {
        User caller = resolveUser(userDetails);
        Optional<ClassSession> periodOpt = timetableService.getCurrentOrNextPeriod(caller.getId());

        Map<String, Object> response = new LinkedHashMap<>();
        if (periodOpt.isEmpty()) {
            response.put("session", null);
            response.put("captureAllowed", false);
            response.put("message", "No scheduled period found for today");
            return ResponseEntity.ok(response);
        }

        ClassSession cs = periodOpt.get();
        boolean captureAllowed = timetableService.isCaptureAllowed(cs, graceMinutes());

        response.put("session",        sessionToMap(cs));
        response.put("captureAllowed", captureAllowed);
        response.put("windowOpen",     cs.getStartTime().minusMinutes(5).toString());
        response.put("windowClose",    cs.getEndTime().plusMinutes(graceMinutes()).toString());
        return ResponseEntity.ok(response);
    }

    /** GET /api/timetable/today  — today's sessions visible to the calling teacher */
    @GetMapping("/today")
    public ResponseEntity<List<Map<String, Object>>> getTodaySessions(
            @AuthenticationPrincipal UserDetails userDetails) {
        User caller = resolveUser(userDetails);
        LocalDate today = LocalDate.now();
        List<ClassSession> sessions;
        if (caller.getRole() == User.Role.ADMIN || caller.getRole() == User.Role.HOD) {
            sessions = timetableService.getTodaySessions();
        } else {
            sessions = sessionRepo.findByDateAndTeacher_IdOrderByStartTimeAsc(today, caller.getId());
        }
        return ResponseEntity.ok(sessions.stream().map(this::sessionToMap).toList());
    }

    /**
     * GET /api/timetable/dashboard/today
     * Admin/HOD dashboard: summary of today's schedule, session status counts,
     * teachers on leave, and pending substitutions.
     */
    @GetMapping("/dashboard/today")
    public ResponseEntity<Map<String, Object>> getDashboardToday(
            @AuthenticationPrincipal UserDetails userDetails) {
        User caller = resolveUser(userDetails);
        if (caller.getRole() != User.Role.ADMIN && caller.getRole() != User.Role.HOD) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin or HOD access required"));
        }

        LocalDate today = LocalDate.now();
        List<ClassSession> todaySessions = timetableService.getTodaySessions();
        List<TeacherLeave> leavesToday = leaveRepo.findAll().stream()
                .filter(l -> l.isApproved() && !today.isBefore(l.getFromDate()) && !today.isAfter(l.getToDate()))
                .toList();

        long scheduledCount   = todaySessions.stream().filter(s -> s.getStatus() == ClassSession.SessionStatus.SCHEDULED).count();
        long conductedCount   = todaySessions.stream().filter(s -> s.getStatus() == ClassSession.SessionStatus.CONDUCTED).count();
        long cancelledCount   = todaySessions.stream().filter(s -> s.getStatus() == ClassSession.SessionStatus.CANCELLED).count();
        long substitutedCount = todaySessions.stream().filter(s -> s.getStatus() == ClassSession.SessionStatus.SUBSTITUTED).count();
        long missedCount      = todaySessions.stream().filter(s -> s.getStatus() == ClassSession.SessionStatus.MISSED).count();

        List<Map<String, Object>> pendingSubs = todaySessions.stream()
                .filter(s -> s.getStatus() == ClassSession.SessionStatus.CANCELLED && s.getSubstituteTeacher() == null)
                .map(this::sessionToMap)
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", today.toString());
        result.put("totalSessions", todaySessions.size());
        result.put("scheduledSessions", scheduledCount);
        result.put("conductedSessions", conductedCount);
        result.put("cancelledSessions", cancelledCount);
        result.put("substitutedSessions", substitutedCount);
        result.put("missedSessions", missedCount);
        result.put("teachersOnLeaveCount", leavesToday.size());
        result.put("teachersOnLeave", leavesToday.stream().map(l -> Map.of(
                "teacherId", l.getTeacher().getId(),
                "teacherName", l.getTeacher().getFullName() != null ? l.getTeacher().getFullName() : l.getTeacher().getUsername(),
                "reason", l.getReason() != null ? l.getReason() : "",
                "fromDate", l.getFromDate().toString(),
                "toDate", l.getToDate().toString()
        )).toList());
        result.put("pendingSubstitutions", pendingSubs);
        result.put("sessions", todaySessions.stream().map(this::sessionToMap).toList());

        return ResponseEntity.ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Admin: session generation, range listing
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/timetable/sessions/generate
     * Body: { "from": "2026-10-01", "to": "2026-12-31" }
     */
    @PostMapping("/sessions/generate")
    public ResponseEntity<Map<String, Object>> generateSessions(
            @RequestBody Map<String, String> body) {
        LocalDate from = LocalDate.parse(body.getOrDefault("from", LocalDate.now().toString()));
        LocalDate to   = LocalDate.parse(body.getOrDefault("to",   LocalDate.now().plusDays(7).toString()));
        int created = timetableService.generateSessionsForRange(from, to);
        return ResponseEntity.ok(Map.of("created", created, "from", from.toString(), "to", to.toString()));
    }

    /** GET /api/timetable/sessions/range?from=2026-10-01&to=2026-10-31 */
    @GetMapping("/sessions/range")
    public ResponseEntity<List<Map<String, Object>>> getSessionsInRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(timetableService.getSessionsForDateRange(from, to)
                .stream().map(this::sessionToMap).toList());
    }

    /** POST /api/timetable/sessions/{id}/cancel  Body: { "reason": "..." } */
    @PostMapping("/sessions/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelSession(@PathVariable Long id,
                                                              @RequestBody Map<String, String> body) {
        ClassSession cs = sessionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + id));
        cs.setStatus(ClassSession.SessionStatus.CANCELLED);
        cs.setReason(body.getOrDefault("reason", "Cancelled by admin"));
        sessionRepo.save(cs);
        return ResponseEntity.ok(Map.of("id", id, "status", "CANCELLED"));
    }

    /** POST /api/timetable/sessions/{id}/substitute  Body: { "substituteId": 5, "reason": "..." } */
    @PostMapping("/sessions/{id}/substitute")
    public ResponseEntity<Map<String, Object>> assignSubstitute(@PathVariable Long id,
                                                                 @RequestBody Map<String, Object> body) {
        Long subId  = Long.parseLong(body.get("substituteId").toString());
        String reason = body.getOrDefault("reason", "Substitute assigned").toString();
        ClassSession cs = timetableService.assignSubstitute(id, subId, reason);
        return ResponseEntity.ok(Map.of("id", id, "status", cs.getStatus().name()));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Academic Terms CRUD
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping("/terms")
    public ResponseEntity<List<AcademicTerm>> getTerms() {
        return ResponseEntity.ok(termRepo.findAll());
    }

    @PostMapping("/terms")
    public ResponseEntity<AcademicTerm> createTerm(@RequestBody AcademicTerm term) {
        if (term.isActive()) {
            // Deactivate any existing active term
            termRepo.findByActiveTrue().ifPresent(existing -> {
                existing.setActive(false);
                termRepo.save(existing);
            });
        }
        return ResponseEntity.ok(termRepo.save(term));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Teacher Leaves
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping("/leaves")
    public ResponseEntity<List<TeacherLeave>> getLeaves() {
        return ResponseEntity.ok(leaveRepo.findAll());
    }

    /**
     * POST /api/timetable/leaves
     * Body: { "teacherId": 3, "fromDate": "2026-10-05", "toDate": "2026-10-05", "reason": "..." }
     */
    @PostMapping("/leaves")
    public ResponseEntity<Map<String, Object>> createLeave(@RequestBody Map<String, Object> body) {
        Long teacherId     = Long.parseLong(body.get("teacherId").toString());
        LocalDate fromDate = LocalDate.parse(body.get("fromDate").toString());
        LocalDate toDate   = LocalDate.parse(body.get("toDate").toString());
        String reason      = body.getOrDefault("reason", "").toString();

        User teacher = userRepo.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Teacher not found: " + teacherId));

        TeacherLeave leave = new TeacherLeave();
        leave.setTeacher(teacher);
        leave.setFromDate(fromDate);
        leave.setToDate(toDate);
        leave.setReason(reason);
        leave.setApproved(false);
        leaveRepo.save(leave);

        return ResponseEntity.ok(Map.of("id", leave.getId(), "status", "PENDING_APPROVAL"));
    }

    /** PUT /api/timetable/leaves/{id}/approve */
    @PutMapping("/leaves/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveLeave(@PathVariable Long id,
                                                             @AuthenticationPrincipal UserDetails userDetails) {
        TeacherLeave leave = leaveRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Leave not found: " + id));
        User approver = resolveUser(userDetails);
        leave.setApproved(true);
        leave.setApprovedBy(approver);
        leaveRepo.save(leave);

        // Cancel affected class sessions
        List<Long> cancelledIds = timetableService.cancelSessionsForLeave(leave);
        return ResponseEntity.ok(Map.of(
                "id", id, "approved", true,
                "cancelledSessions", cancelledIds.size(),
                "cancelledSessionIds", cancelledIds));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CSV Template and Upload
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping(value = "/template", produces = "text/csv")
    public ResponseEntity<String> getTimetableTemplate() {
        String csv = "day,start_time,end_time,subject_code,section,teacher_username,room\n" +
                     "MONDAY,09:00,10:00,CS101,CS-2026-A,teacher,Room 101\n" +
                     "WEDNESDAY,09:00,10:00,CS101,CS-2026-A,teacher,Room 101\n" +
                     "FRIDAY,09:00,10:00,CS101,CS-2026-A,teacher,Room 101\n" +
                     "TUESDAY,10:00,11:00,MATH101,CS-2026-A,teacher2,Room 101\n" +
                     "THURSDAY,10:00,11:00,MATH101,CS-2026-A,teacher2,Room 101\n";
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"timetable-template.csv\"")
                .body(csv);
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadTimetableCsv(
            @RequestParam(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @RequestBody(required = false) String rawBody,
            @RequestParam(value = "commit", defaultValue = "true") boolean commit) {
        String csvContent = "";
        try {
            if (file != null && !file.isEmpty()) {
                csvContent = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
            } else if (rawBody != null && !rawBody.isBlank()) {
                csvContent = rawBody;
            } else {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "No CSV content or file provided"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Failed to read CSV: " + e.getMessage()));
        }

        Map<String, Object> result = timetableService.validateAndImportTimetableCsv(csvContent, commit);
        return ResponseEntity.ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Timetable Slots CRUD
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping("/slots")
    public ResponseEntity<List<Map<String, Object>>> getSlots() {
        Optional<AcademicTerm> term = termRepo.findByActiveTrue();
        List<TimetableSlot> slots = term.map(t -> slotRepo.findByTerm_IdAndActiveTrue(t.getId()))
                .orElseGet(() -> slotRepo.findAll().stream().filter(TimetableSlot::isActive).toList());
        return ResponseEntity.ok(slots.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("dayOfWeek", s.getDayOfWeek());
            m.put("startTime", s.getStartTime().toString());
            m.put("endTime", s.getEndTime().toString());
            if (s.getSubject() != null) {
                m.put("subjectCode", s.getSubject().getCode());
                m.put("subjectName", s.getSubject().getName());
            }
            if (s.getClassSection() != null) {
                m.put("sectionName", s.getClassSection().getName());
            }
            if (s.getTeacher() != null) {
                m.put("teacherUsername", s.getTeacher().getUsername());
                m.put("teacherName", s.getTeacher().getFullName());
            }
            if (s.getRoom() != null) {
                m.put("roomName", s.getRoom().getName());
            }
            return m;
        }).toList());
    }

    @DeleteMapping("/slots/{id}")
    public ResponseEntity<Map<String, Object>> deleteSlot(@PathVariable Long id) {
        slotRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("id", id, "deleted", true));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Auxiliary Reference CRUD (Sections, Subjects, Rooms, Teachers, Holidays)
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping("/sections")
    public ResponseEntity<List<ClassSection>> getSections() {
        return ResponseEntity.ok(sectionRepo.findAll());
    }

    @PostMapping("/sections")
    public ResponseEntity<ClassSection> createSection(@RequestBody ClassSection section) {
        return ResponseEntity.ok(sectionRepo.save(section));
    }

    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getSubjects() {
        return ResponseEntity.ok(subjectRepo.findAll());
    }

    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Subject subject) {
        return ResponseEntity.ok(subjectRepo.save(subject));
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<Room>> getRooms() {
        return ResponseEntity.ok(roomRepo.findAll());
    }

    @PostMapping("/rooms")
    public ResponseEntity<Room> createRoom(@RequestBody Room room) {
        return ResponseEntity.ok(roomRepo.save(room));
    }

    @GetMapping("/teachers")
    public ResponseEntity<List<Map<String, Object>>> getTeachers() {
        List<User> teachers = userRepo.findAll().stream()
                .filter(u -> u.getRole() == User.Role.TEACHER || u.getRole() == User.Role.HOD)
                .toList();
        return ResponseEntity.ok(teachers.stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("fullName", u.getFullName());
            m.put("email", u.getEmail());
            m.put("role", u.getRole().name());
            return m;
        }).toList());
    }

    @GetMapping("/holidays")
    public ResponseEntity<List<Holiday>> getHolidays() {
        return ResponseEntity.ok(holidayRepo.findAll());
    }

    @PostMapping("/holidays")
    public ResponseEntity<Holiday> createHoliday(@RequestBody Holiday holiday) {
        return ResponseEntity.ok(holidayRepo.save(holiday));
    }

    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<Map<String, Object>> deleteHoliday(@PathVariable Long id) {
        holidayRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("id", id, "deleted", true));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private int graceMinutes() {
        try {
            return Integer.parseInt(System.getenv().getOrDefault("CAPTURE_GRACE_MINUTES", "15"));
        } catch (NumberFormatException e) {
            return 15;
        }
    }

    private User resolveUser(UserDetails userDetails) {
        return userRepo.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in DB"));
    }

    private Map<String, Object> sessionToMap(ClassSession cs) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          cs.getId());
        m.put("date",        cs.getDate().toString());
        m.put("startTime",   cs.getStartTime().toString());
        m.put("endTime",     cs.getEndTime().toString());
        m.put("status",      cs.getStatus().name());
        m.put("type",        cs.getType().name());
        m.put("reason",      cs.getReason());
        if (cs.getSubject() != null) {
            m.put("subjectCode", cs.getSubject().getCode());
            m.put("subjectName", cs.getSubject().getName());
            m.put("subjectId",   cs.getSubject().getId());
        }
        if (cs.getClassSection() != null) {
            m.put("sectionName", cs.getClassSection().getName());
            m.put("sectionId",   cs.getClassSection().getId());
        }
        if (cs.getTeacher() != null) {
            m.put("teacherUsername", cs.getTeacher().getUsername());
            m.put("teacherFullName", cs.getTeacher().getFullName());
            m.put("teacherId",       cs.getTeacher().getId());
        }
        if (cs.getSubstituteTeacher() != null) {
            m.put("substituteTeacherUsername", cs.getSubstituteTeacher().getUsername());
            m.put("substituteTeacherId",       cs.getSubstituteTeacher().getId());
        }
        if (cs.getRoom() != null) {
            m.put("roomName", cs.getRoom().getName());
            m.put("roomId",   cs.getRoom().getId());
        }
        return m;
    }
}
