package com.classsight.controller;

import com.classsight.entity.FacultySubjectAssignment;
import com.classsight.entity.User;
import com.classsight.repository.FacultySubjectAssignmentRepository;
import com.classsight.repository.UserRepository;
import com.classsight.service.AttendanceAnalyticsService;
import com.classsight.service.AttendanceExcelReportService;
import com.classsight.service.AttendancePdfReportService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AttendanceAnalyticsController {

    private final AttendanceAnalyticsService analyticsService;
    private final AttendancePdfReportService pdfReportService;
    private final AttendanceExcelReportService excelReportService;
    private final UserRepository userRepository;
    private final FacultySubjectAssignmentRepository assignmentRepository;

    public AttendanceAnalyticsController(AttendanceAnalyticsService analyticsService,
                                         AttendancePdfReportService pdfReportService,
                                         AttendanceExcelReportService excelReportService,
                                         UserRepository userRepository,
                                         FacultySubjectAssignmentRepository assignmentRepository) {
        this.analyticsService = analyticsService;
        this.pdfReportService = pdfReportService;
        this.excelReportService = excelReportService;
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
    }

    @GetMapping("/attendance")
    public ResponseEntity<Map<String, Object>> attendance(
            @RequestParam Long subjectId,
            @RequestParam Long classSectionId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            Principal principal) {
        return ResponseEntity.ok(analyticsService.analytics(subjectId, classSectionId, from, to, currentUser(principal)));
    }

    @GetMapping(value = "/attendance/report.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> reportPdf(
            @RequestParam Long subjectId,
            @RequestParam Long classSectionId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            Principal principal) {
        Map<String, Object> analytics = analyticsService.analytics(subjectId, classSectionId, from, to, currentUser(principal));
        byte[] pdf = pdfReportService.generate(analytics);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("attendance-report.pdf").build().toString())
                .body(pdf);
    }

    @GetMapping(value = "/attendance/report.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> reportExcel(
            @RequestParam Long subjectId,
            @RequestParam Long classSectionId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            Principal principal) {
        Map<String, Object> analytics = analyticsService.analytics(subjectId, classSectionId, from, to, currentUser(principal));
        byte[] xlsx = excelReportService.generate(analytics);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("attendance-report.xlsx").build().toString())
                .body(xlsx);
    }

    private User currentUser(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }

    // ── Convenience endpoints matching frontend URL scheme ───────────────────

    /**
     * GET /api/analytics/assignment/{assignmentId}
     * Returns analytics for the subject+section bound to the given faculty assignment ID.
     */
    @GetMapping("/assignment/{assignmentId}")
    public ResponseEntity<Map<String, Object>> byAssignment(
            @PathVariable Long assignmentId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            Principal principal) {
        FacultySubjectAssignment asgn = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));
        return ResponseEntity.ok(
                analyticsService.analytics(asgn.getSubject().getId(),
                                           asgn.getClassSection().getId(),
                                           from, to, currentUser(principal)));
    }

    /** GET /api/analytics/assignment/{id}/xlsx — Excel report */
    @GetMapping(value = "/assignment/{assignmentId}/xlsx",
                produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> byAssignmentXlsx(
            @PathVariable Long assignmentId,
            Principal principal) {
        FacultySubjectAssignment asgn = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));
        Map<String, Object> analytics = analyticsService.analytics(
                asgn.getSubject().getId(), asgn.getClassSection().getId(), null, null, currentUser(principal));
        byte[] xlsx = excelReportService.generate(analytics);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("attendance-" + assignmentId + ".xlsx").build().toString())
                .body(xlsx);
    }

    /** GET /api/analytics/assignment/{id}/pdf — PDF report */
    @GetMapping(value = "/assignment/{assignmentId}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> byAssignmentPdf(
            @PathVariable Long assignmentId,
            Principal principal) {
        FacultySubjectAssignment asgn = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));
        Map<String, Object> analytics = analyticsService.analytics(
                asgn.getSubject().getId(), asgn.getClassSection().getId(), null, null, currentUser(principal));
        byte[] pdf = pdfReportService.generate(analytics);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("attendance-" + assignmentId + ".pdf").build().toString())
                .body(pdf);
    }

    /**
     * GET /api/analytics/all
     * Returns analytics summaries for all assignments visible to the calling teacher.
     */
    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> allAssignments(Principal principal) {
        User user = currentUser(principal);
        List<FacultySubjectAssignment> assignments = assignmentRepository.findByFacultyIdAndActiveTrue(user.getId());
        List<Map<String, Object>> results = new ArrayList<>();
        for (FacultySubjectAssignment asgn : assignments) {
            try {
                results.add(analyticsService.analytics(
                        asgn.getSubject().getId(), asgn.getClassSection().getId(),
                        null, null, user));
            } catch (Exception ignored) { /* skip if no data */ }
        }
        return ResponseEntity.ok(results);
    }
}
