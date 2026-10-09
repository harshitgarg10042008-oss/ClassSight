package com.classsight.controller;

import com.classsight.entity.*;
import com.classsight.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * StudentPortalController — Phase 4 student read-only view.
 *
 * Mapped to /student/**
 * Accessible to STUDENT, TEACHER, and ADMIN roles.
 */
@RestController
@RequestMapping("/student")
public class StudentPortalController {

    private final StudentRepository studentRepo;
    private final StudentEnrollmentRepository enrollmentRepo;
    private final AttendanceRecordRepository recordRepo;
    private final ClassSessionRepository sessionRepo;
    private final AttendanceDisputeRepository disputeRepo;
    private final StudentLeaveRepository studentLeaveRepo;

    public StudentPortalController(StudentRepository studentRepo,
                                   StudentEnrollmentRepository enrollmentRepo,
                                   AttendanceRecordRepository recordRepo,
                                   ClassSessionRepository sessionRepo,
                                   AttendanceDisputeRepository disputeRepo,
                                   StudentLeaveRepository studentLeaveRepo) {
        this.studentRepo = studentRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.recordRepo = recordRepo;
        this.sessionRepo = sessionRepo;
        this.disputeRepo = disputeRepo;
        this.studentLeaveRepo = studentLeaveRepo;
    }

    /**
     * GET /student/profile
     * Returns student's personal details and enrolled subjects.
     */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(
            @RequestParam(required = false) String rollNumber,
            @AuthenticationPrincipal UserDetails userDetails) {
        Student student = resolveStudent(rollNumber, userDetails);
        if (student == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Student record not found"));
        }

        List<StudentEnrollment> enrollments = enrollmentRepo.findByStudent_IdAndActiveTrue(student.getId());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", student.getId());
        res.put("rollNumber", student.getRollNumber());
        res.put("firstName", student.getFirstName());
        res.put("lastName", student.getLastName());
        res.put("active", student.getActive());
        res.put("consentGiven", student.getConsentGiven());
        if (student.getClassSection() != null) {
            res.put("classSection", Map.of(
                    "id", student.getClassSection().getId(),
                    "name", student.getClassSection().getName(),
                    "academicYear", student.getClassSection().getAcademicYear()
            ));
        }
        res.put("enrolledSubjects", enrollments.stream()
                .filter(e -> e.getSubject() != null)
                .map(e -> Map.of(
                        "id", e.getSubject().getId(),
                        "code", e.getSubject().getCode(),
                        "name", e.getSubject().getName()
                )).toList());

        return ResponseEntity.ok(res);
    }

    /**
     * GET /student/attendance
     * Returns historical attendance records for the student.
     */
    @GetMapping("/attendance")
    public ResponseEntity<List<Map<String, Object>>> getAttendanceHistory(
            @RequestParam(required = false) String rollNumber,
            @RequestParam(required = false) Long subjectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Student student = resolveStudent(rollNumber, userDetails);
        if (student == null) {
            return ResponseEntity.status(404).body(List.of());
        }

        List<AttendanceRecord> records = recordRepo.findFinalizedRecordsForStudent(student.getId());
        if (subjectId != null) {
            records = records.stream()
                    .filter(r -> r.getSession() != null && r.getSession().getSubject() != null
                            && Objects.equals(r.getSession().getSubject().getId(), subjectId))
                    .toList();
        }

        List<Map<String, Object>> list = records.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("recordId", r.getId());
            m.put("status", r.getStatus().name());
            m.put("confidenceScore", r.getConfidenceScore());
            if (r.getSession() != null) {
                AttendanceSession s = r.getSession();
                m.put("sessionId", s.getId());
                m.put("date", s.getStartedAt() != null ? s.getStartedAt().toLocalDate().toString() : "");
                m.put("startedAt", s.getStartedAt() != null ? s.getStartedAt().toString() : "");
                if (s.getSubject() != null) {
                    m.put("subjectCode", s.getSubject().getCode());
                    m.put("subjectName", s.getSubject().getName());
                }
                if (s.getRoom() != null) {
                    m.put("roomName", s.getRoom().getName());
                }
            }
            return m;
        }).toList();

        return ResponseEntity.ok(list);
    }

    /**
     * GET /student/summary
     * Returns aggregated attendance stats (total conducted, total present, percentage, defaulter flag).
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getAttendanceSummary(
            @RequestParam(required = false) String rollNumber,
            @AuthenticationPrincipal UserDetails userDetails) {
        Student student = resolveStudent(rollNumber, userDetails);
        if (student == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Student record not found"));
        }

        List<AttendanceRecord> records = recordRepo.findFinalizedRecordsForStudent(student.getId());

        // Group by subject
        Map<Long, SubjectSummary> summaryMap = new HashMap<>();
        int overallTotal = 0;
        int overallPresent = 0;

        for (AttendanceRecord r : records) {
            if (r.getSession() == null || r.getSession().getSubject() == null) continue;
            // Exclude CANCELLED class sessions
            if (r.getSession().getClassSession() != null
                    && r.getSession().getClassSession().getStatus() == ClassSession.SessionStatus.CANCELLED) {
                continue;
            }
            // Exclude sessions where student has approved leave (Medical or Duty/OD)
            LocalDate sessionDate = r.getSession().getStartedAt() != null ? r.getSession().getStartedAt().toLocalDate() : null;
            if (sessionDate != null && studentLeaveRepo != null) {
                List<StudentLeave> approvedLeaves = studentLeaveRepo.findApprovedLeaveOnDate(student.getId(), sessionDate);
                if (!approvedLeaves.isEmpty()) {
                    continue;
                }
            }
            Subject sub = r.getSession().getSubject();
            SubjectSummary sm = summaryMap.computeIfAbsent(sub.getId(), k -> new SubjectSummary(sub));
            sm.total++;
            overallTotal++;
            if (r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT) {
                sm.present++;
                overallPresent++;
            }
        }

        BigDecimal overallPct = overallTotal == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(overallPresent * 100.0 / overallTotal).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("studentId", student.getId());
        res.put("rollNumber", student.getRollNumber());
        res.put("studentName", student.getFirstName() + " " + student.getLastName());
        res.put("overallTotal", overallTotal);
        res.put("overallPresent", overallPresent);
        res.put("overallPercentage", overallPct);
        res.put("isDefaulter", overallPct.doubleValue() < 75.0);
        res.put("subjects", summaryMap.values().stream().map(SubjectSummary::toMap).toList());

        return ResponseEntity.ok(res);
    }

    /**
     * GET /student/timetable
     * Returns today's scheduled class sessions for the student's section.
     */
    @GetMapping("/timetable")
    public ResponseEntity<List<Map<String, Object>>> getStudentTimetable(
            @RequestParam(required = false) String rollNumber,
            @AuthenticationPrincipal UserDetails userDetails) {
        Student student = resolveStudent(rollNumber, userDetails);
        if (student == null || student.getClassSection() == null) {
            return ResponseEntity.ok(List.of());
        }

        LocalDate today = LocalDate.now();
        List<ClassSession> sessions = sessionRepo.findByDateAndClassSection_IdOrderByStartTimeAsc(
                today, student.getClassSection().getId());

        return ResponseEntity.ok(sessions.stream().map(cs -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", cs.getId());
            m.put("startTime", cs.getStartTime().toString());
            m.put("endTime", cs.getEndTime().toString());
            m.put("status", cs.getStatus().name());
            if (cs.getSubject() != null) {
                m.put("subjectCode", cs.getSubject().getCode());
                m.put("subjectName", cs.getSubject().getName());
            }
            if (cs.getTeacher() != null) {
                m.put("teacherName", cs.getTeacher().getFullName() != null ? cs.getTeacher().getFullName() : cs.getTeacher().getUsername());
            }
            if (cs.getRoom() != null) {
                m.put("roomName", cs.getRoom().getName());
            }
            return m;
        }).toList());
    }

    /**
     * POST /student/disputes
     * Body: { "recordId": 123, "reason": "I was present in class" }
     */
    @PostMapping("/disputes")
    public ResponseEntity<Map<String, Object>> raiseDispute(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long recordId = Long.parseLong(body.get("recordId").toString());
        String reason = body.getOrDefault("reason", "").toString();
        AttendanceRecord record = recordRepo.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Record not found: " + recordId));

        AttendanceDispute dispute = new AttendanceDispute();
        dispute.setStudent(record.getStudent());
        dispute.setAttendanceRecord(record);
        if (record.getSession() != null) {
            dispute.setClassSession(record.getSession().getClassSession());
        }
        dispute.setReason(reason);
        dispute.setStatus(AttendanceDispute.DisputeStatus.PENDING);
        disputeRepo.save(dispute);

        return ResponseEntity.ok(Map.of("id", dispute.getId(), "status", "PENDING", "message", "Dispute raised successfully"));
    }

    /** GET /student/disputes — list disputes raised by student */
    @GetMapping("/disputes")
    public ResponseEntity<List<Map<String, Object>>> getMyDisputes(
            @RequestParam(required = false) String rollNumber,
            @AuthenticationPrincipal UserDetails userDetails) {
        Student student = resolveStudent(rollNumber, userDetails);
        if (student == null) return ResponseEntity.ok(List.of());
        List<AttendanceDispute> list = disputeRepo.findByStudent_IdOrderByCreatedAtDesc(student.getId());
        return ResponseEntity.ok(list.stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("recordId", d.getAttendanceRecord() != null ? d.getAttendanceRecord().getId() : null);
            m.put("reason", d.getReason());
            m.put("status", d.getStatus().name());
            m.put("resolutionNotes", d.getResolutionNotes());
            m.put("createdAt", d.getCreatedAt().toString());
            return m;
        }).toList());
    }

    /**
     * POST /student/leaves
     * Body: { "leaveType": "MEDICAL" | "DUTY_OD", "fromDate": "2026-10-06", "toDate": "2026-10-07", "reason": "...", "documentUrl": "" }
     */
    @PostMapping("/leaves")
    public ResponseEntity<Map<String, Object>> applyLeave(
            @RequestParam(required = false) String rollNumber,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        Student student = resolveStudent(rollNumber, userDetails);
        if (student == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Student not found"));
        }
        String typeStr = body.getOrDefault("leaveType", "MEDICAL").toString();
        LocalDate from = LocalDate.parse(body.get("fromDate").toString());
        LocalDate to = LocalDate.parse(body.get("toDate").toString());
        String reason = body.getOrDefault("reason", "").toString();
        String docUrl = body.getOrDefault("documentUrl", "").toString();

        StudentLeave leave = new StudentLeave();
        leave.setStudent(student);
        leave.setLeaveType(StudentLeave.LeaveType.valueOf(typeStr.toUpperCase()));
        leave.setFromDate(from);
        leave.setToDate(to);
        leave.setReason(reason);
        leave.setDocumentUrl(docUrl);
        leave.setStatus(StudentLeave.LeaveStatus.PENDING);
        studentLeaveRepo.save(leave);

        return ResponseEntity.ok(Map.of("id", leave.getId(), "status", "PENDING", "message", "Leave application submitted"));
    }

    /** GET /student/leaves — list student's leaves */
    @GetMapping("/leaves")
    public ResponseEntity<List<Map<String, Object>>> getMyLeaves(
            @RequestParam(required = false) String rollNumber,
            @AuthenticationPrincipal UserDetails userDetails) {
        Student student = resolveStudent(rollNumber, userDetails);
        if (student == null) return ResponseEntity.ok(List.of());
        List<StudentLeave> list = studentLeaveRepo.findByStudent_IdOrderByFromDateDesc(student.getId());
        return ResponseEntity.ok(list.stream().map(l -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", l.getId());
            m.put("leaveType", l.getLeaveType().name());
            m.put("fromDate", l.getFromDate().toString());
            m.put("toDate", l.getToDate().toString());
            m.put("reason", l.getReason());
            m.put("status", l.getStatus().name());
            m.put("documentUrl", l.getDocumentUrl());
            return m;
        }).toList());
    }

    private Student resolveStudent(String rollNumber, UserDetails userDetails) {
        if (rollNumber != null && !rollNumber.isBlank()) {
            return studentRepo.findByRollNumber(rollNumber).orElse(null);
        }
        if (userDetails != null) {
            return studentRepo.findByRollNumber(userDetails.getUsername()).orElse(null);
        }
        return null;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // /api/student/** aliases — frontend convenience URLs
    // ──────────────────────────────────────────────────────────────────────────

    /** GET /api/student/my-attendance — per-subject summary (used by student portal) */
    @GetMapping("/api/my-attendance")
    public ResponseEntity<Map<String, Object>> myAttendanceSummary(
            @AuthenticationPrincipal UserDetails userDetails) {
        return getAttendanceSummary(null, userDetails);
    }

    /** GET /api/student/my-disputes */
    @GetMapping("/api/my-disputes")
    public ResponseEntity<List<Map<String, Object>>> myDisputes(
            @AuthenticationPrincipal UserDetails userDetails) {
        return getMyDisputes(null, userDetails);
    }

    /**
     * POST /api/student/dispute
     * Body: { sessionId: 42, reason: "..." }
     * The frontend sends sessionId — we map it to the first record in that session.
     */
    @PostMapping("/api/dispute")
    public ResponseEntity<Map<String, Object>> raiseDisputeBySession(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Accept sessionId OR recordId
        if (body.containsKey("sessionId") && !body.containsKey("recordId")) {
            // find the student's record for that session
            Student student = resolveStudent(null, userDetails);
            if (student == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Student not found"));
            }
            Long sessId = Long.parseLong(body.get("sessionId").toString());
            List<AttendanceRecord> recs = recordRepo.findFinalizedRecordsForStudent(student.getId())
                    .stream()
                    .filter(r -> r.getSession() != null && r.getSession().getId().equals(sessId))
                    .toList();
            if (recs.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "No attendance record found for session #" + sessId + " for this student"));
            }
            Map<String, Object> mapped = new java.util.LinkedHashMap<>(body);
            mapped.put("recordId", recs.get(0).getId());
            return raiseDispute(mapped, userDetails);
        }
        return raiseDispute(body, userDetails);
    }

    private static class SubjectSummary {

        final Subject subject;
        int total = 0;
        int present = 0;

        SubjectSummary(Subject subject) {
            this.subject = subject;
        }

        Map<String, Object> toMap() {
            BigDecimal pct = total == 0 ? BigDecimal.ZERO
                    : BigDecimal.valueOf(present * 100.0 / total).setScale(2, RoundingMode.HALF_UP);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subjectId", subject.getId());
            m.put("subjectCode", subject.getCode());
            m.put("subjectName", subject.getName());
            m.put("totalLectures", total);
            m.put("attendedLectures", present);
            m.put("percentage", pct);
            m.put("defaulter", pct.doubleValue() < 75.0);
            return m;
        }
    }
}
