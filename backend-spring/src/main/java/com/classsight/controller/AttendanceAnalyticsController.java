package com.classsight.controller;

import com.classsight.entity.User;
import com.classsight.repository.UserRepository;
import com.classsight.service.AttendanceAnalyticsService;
import com.classsight.service.AttendancePdfReportService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AttendanceAnalyticsController {

    private final AttendanceAnalyticsService analyticsService;
    private final AttendancePdfReportService pdfReportService;
    private final UserRepository userRepository;

    public AttendanceAnalyticsController(AttendanceAnalyticsService analyticsService,
                                         AttendancePdfReportService pdfReportService,
                                         UserRepository userRepository) {
        this.analyticsService = analyticsService;
        this.pdfReportService = pdfReportService;
        this.userRepository = userRepository;
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
    public ResponseEntity<byte[]> report(
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

    private User currentUser(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
