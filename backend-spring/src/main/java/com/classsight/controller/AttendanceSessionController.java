package com.classsight.controller;

import com.classsight.entity.AttendanceSession;
import com.classsight.entity.User;
import com.classsight.service.AttendanceSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance-sessions")
public class AttendanceSessionController {

    @Autowired
    private AttendanceSessionService attendanceSessionService;

    @GetMapping("/my-sessions")
    public ResponseEntity<List<AttendanceSession>> getMySessions(@AuthenticationPrincipal User faculty) {
        List<AttendanceSession> sessions = attendanceSessionService.getAllSessionsByFaculty(faculty);
        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/latest")
    public ResponseEntity<AttendanceSession> getLatestSession(@AuthenticationPrincipal User faculty) {
        return attendanceSessionService.getLatestSessionByFaculty(faculty)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AttendanceSession> getSessionById(@PathVariable Long id) {
        return attendanceSessionService.getSessionById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> getSessionStatus(@PathVariable Long id) {
        return attendanceSessionService.getSessionById(id)
                .map(session -> {
                    Map<String, Object> response = new java.util.HashMap<>();
                    response.put("sessionId", session.getId());
                    response.put("status", session.getStatus().toString());
                    response.put("startedAt", session.getStartedAt());
                    response.put("endedAt", session.getEndedAt());
                    response.put("faculty", session.getFaculty().getUsername());
                    response.put("room", session.getRoom().getName());
                    response.put("subject", session.getSubject().getName());
                    response.put("classSection", session.getClassSection().getName());
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/transition")
    public ResponseEntity<AttendanceSession> transitionStatus(
            @PathVariable Long id,
            @RequestParam AttendanceSession.SessionStatus newStatus) {
        if (newStatus == AttendanceSession.SessionStatus.FINALIZED) {
            return ResponseEntity.status(409).build();
        }
        try {
            AttendanceSession updatedSession = attendanceSessionService.updateStatus(id, newStatus);
            return ResponseEntity.ok(updatedSession);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTestSession(
            @PathVariable Long id,
            @AuthenticationPrincipal User faculty) {
        AttendanceSession session = attendanceSessionService.getSessionById(id).orElse(null);
        if (session == null || session.getSessionType() != AttendanceSession.SessionType.TEST
                || session.getFaculty() == null || !session.getFaculty().getId().equals(faculty.getId())) {
            return ResponseEntity.notFound().build();
        }
        attendanceSessionService.delete(session);
        return ResponseEntity.noContent().build();
    }
}
