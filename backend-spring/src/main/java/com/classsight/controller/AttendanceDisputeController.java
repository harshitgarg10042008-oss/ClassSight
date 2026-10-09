package com.classsight.controller;

import com.classsight.entity.*;
import com.classsight.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api")
public class AttendanceDisputeController {

    private final AttendanceDisputeRepository disputeRepo;
    private final AttendanceRecordRepository recordRepo;
    private final AttendanceOverrideAuditRepository auditRepo;
    private final StudentLeaveRepository studentLeaveRepo;
    private final UserRepository userRepo;

    public AttendanceDisputeController(AttendanceDisputeRepository disputeRepo,
                                       AttendanceRecordRepository recordRepo,
                                       AttendanceOverrideAuditRepository auditRepo,
                                       StudentLeaveRepository studentLeaveRepo,
                                       UserRepository userRepo) {
        this.disputeRepo = disputeRepo;
        this.recordRepo = recordRepo;
        this.auditRepo = auditRepo;
        this.studentLeaveRepo = studentLeaveRepo;
        this.userRepo = userRepo;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Disputes (Admin / HOD / Teacher)
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping("/disputes")
    public ResponseEntity<List<Map<String, Object>>> getDisputes(
            @RequestParam(required = false) String status) {
        List<AttendanceDispute> list;
        if (status != null && !status.isBlank()) {
            list = disputeRepo.findByStatusOrderByCreatedAtDesc(AttendanceDispute.DisputeStatus.valueOf(status.toUpperCase()));
        } else {
            list = disputeRepo.findAll();
        }
        return ResponseEntity.ok(list.stream().map(this::disputeToMap).toList());
    }

    @PutMapping("/disputes/{id}/resolve")
    @Transactional
    public ResponseEntity<Map<String, Object>> resolveDispute(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        AttendanceDispute dispute = disputeRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispute not found: " + id));

        User resolver = resolveUser(userDetails);
        String action = body.getOrDefault("status", "APPROVED").toString().toUpperCase();
        String notes = body.getOrDefault("resolutionNotes", "").toString();

        AttendanceDispute.DisputeStatus newStatus = AttendanceDispute.DisputeStatus.valueOf(action);
        dispute.setStatus(newStatus);
        dispute.setResolutionNotes(notes);
        dispute.setResolvedBy(resolver);
        dispute.setResolvedAt(LocalDateTime.now());
        disputeRepo.save(dispute);

        if (newStatus == AttendanceDispute.DisputeStatus.APPROVED && dispute.getAttendanceRecord() != null) {
            AttendanceRecord rec = dispute.getAttendanceRecord();
            String oldStatus = rec.getStatus().name();
            rec.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);
            rec.setReviewStatus(AttendanceRecord.ReviewStatus.APPROVED);
            recordRepo.save(rec);

            // Record override audit log
            AttendanceOverrideAudit audit = new AttendanceOverrideAudit();
            audit.setSession(rec.getSession());
            audit.setRecord(rec);
            audit.setStudent(rec.getStudent());
            audit.setOldStatus(oldStatus);
            audit.setNewStatus("PRESENT");
            audit.setModifiedBy(resolver);
            audit.setReason("Dispute #" + id + " approved: " + notes);
            auditRepo.save(audit);
        }

        return ResponseEntity.ok(disputeToMap(dispute));
    }

    /** POST alias for the frontend (same logic as PUT resolve) */
    @PostMapping("/disputes/{id}/resolve")
    @Transactional
    public ResponseEntity<Map<String, Object>> resolveDisputePost(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Map frontend field names: { decision: "APPROVED", note: "..." }
        String decision = body.getOrDefault("decision",
                           body.getOrDefault("status", "APPROVED")).toString().toUpperCase();
        String notes = body.getOrDefault("note",
                        body.getOrDefault("resolutionNotes", "")).toString();
        Map<String, Object> mapped = new LinkedHashMap<>(body);
        mapped.put("status", decision);
        mapped.put("resolutionNotes", notes);
        return resolveDispute(id, mapped, userDetails);
    }

    /** GET /api/disputes/audit — full system audit trail (HOD/Admin) */
    @GetMapping("/disputes/audit")
    public ResponseEntity<List<Map<String, Object>>> getGlobalAuditTrail() {
        List<AttendanceOverrideAudit> audits = auditRepo.findAll();
        return ResponseEntity.ok(audits.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            if (a.getStudent() != null) {
                m.put("studentName", a.getStudent().getFirstName() + " " + a.getStudent().getLastName());
                m.put("rollNumber", a.getStudent().getRollNumber());
            }
            m.put("fieldChanged", "status");
            m.put("oldValue", a.getOldStatus());
            m.put("newValue", a.getNewStatus());
            m.put("changedByUsername", a.getModifiedBy() != null ? a.getModifiedBy().getUsername() : "system");
            m.put("changedAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
            m.put("reason", a.getReason());
            return m;
        }).toList());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Student Leaves Approval (Admin / HOD / Teacher)
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping("/student-leaves")
    public ResponseEntity<List<Map<String, Object>>> getStudentLeaves(
            @RequestParam(required = false) String status) {
        List<StudentLeave> leaves;
        if (status != null && !status.isBlank()) {
            leaves = studentLeaveRepo.findByStatusOrderByFromDateAsc(StudentLeave.LeaveStatus.valueOf(status.toUpperCase()));
        } else {
            leaves = studentLeaveRepo.findAll();
        }
        return ResponseEntity.ok(leaves.stream().map(this::leaveToMap).toList());
    }

    @PutMapping("/student-leaves/{id}/approve")
    @Transactional
    public ResponseEntity<Map<String, Object>> approveStudentLeave(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        StudentLeave leave = studentLeaveRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student leave not found: " + id));

        User approver = resolveUser(userDetails);
        boolean approve = true;
        if (body != null && body.containsKey("approved")) {
            approve = Boolean.parseBoolean(body.get("approved").toString());
        }

        leave.setStatus(approve ? StudentLeave.LeaveStatus.APPROVED : StudentLeave.LeaveStatus.REJECTED);
        leave.setApprovedBy(approver);
        studentLeaveRepo.save(leave);

        return ResponseEntity.ok(leaveToMap(leave));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Attendance Override Audits
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping("/attendance-sessions/{id}/audit")
    public ResponseEntity<List<Map<String, Object>>> getSessionAuditTrail(@PathVariable Long id) {
        List<AttendanceOverrideAudit> audits = auditRepo.findBySession_IdOrderByCreatedAtDesc(id);
        return ResponseEntity.ok(audits.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("studentId", a.getStudent().getId());
            m.put("studentRollNumber", a.getStudent().getRollNumber());
            m.put("oldStatus", a.getOldStatus());
            m.put("newStatus", a.getNewStatus());
            m.put("reason", a.getReason());
            m.put("modifiedBy", a.getModifiedBy() != null ? a.getModifiedBy().getUsername() : "system");
            m.put("createdAt", a.getCreatedAt().toString());
            return m;
        }).toList());
    }

    private User resolveUser(UserDetails userDetails) {
        return userRepo.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalStateException("User not found: " + userDetails.getUsername()));
    }

    private Map<String, Object> disputeToMap(AttendanceDispute d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("studentId", d.getStudent().getId());
        m.put("studentRollNumber", d.getStudent().getRollNumber());
        m.put("studentName", d.getStudent().getFirstName() + " " + d.getStudent().getLastName());
        m.put("recordId", d.getAttendanceRecord() != null ? d.getAttendanceRecord().getId() : null);
        m.put("reason", d.getReason());
        m.put("status", d.getStatus().name());
        m.put("resolutionNotes", d.getResolutionNotes());
        m.put("resolvedBy", d.getResolvedBy() != null ? d.getResolvedBy().getUsername() : null);
        m.put("resolvedAt", d.getResolvedAt() != null ? d.getResolvedAt().toString() : null);
        m.put("createdAt", d.getCreatedAt().toString());
        return m;
    }

    private Map<String, Object> leaveToMap(StudentLeave l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("studentId", l.getStudent().getId());
        m.put("studentRollNumber", l.getStudent().getRollNumber());
        m.put("leaveType", l.getLeaveType().name());
        m.put("fromDate", l.getFromDate().toString());
        m.put("toDate", l.getToDate().toString());
        m.put("reason", l.getReason());
        m.put("documentUrl", l.getDocumentUrl());
        m.put("status", l.getStatus().name());
        m.put("approvedBy", l.getApprovedBy() != null ? l.getApprovedBy().getUsername() : null);
        m.put("createdAt", l.getCreatedAt().toString());
        return m;
    }
}
