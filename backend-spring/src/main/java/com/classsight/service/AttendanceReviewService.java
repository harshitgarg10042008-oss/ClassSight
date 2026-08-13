package com.classsight.service;

import com.classsight.entity.AttendanceRecord;
import com.classsight.entity.AttendanceSession;
import com.classsight.entity.User;
import com.classsight.repository.AttendanceSessionRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AttendanceReviewService {

    private final AttendanceSessionRepository sessionRepository;

    public AttendanceReviewService(AttendanceSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getReview(Long sessionId, User actor) {
        AttendanceSession session = authorizedSession(sessionId, actor);
        List<Map<String, Object>> records = reviewRecords(session);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("status", session.getStatus().toString());
        response.put("capturedPhotoPath", session.getCapturedPhotoPath());
        response.put("photoUrl", "/api/attendance-sessions/" + sessionId + "/review/photo");
        response.put("records", records);
        return response;
    }

    @Transactional(readOnly = true)
    public PhotoFile getPhoto(Long sessionId, User actor) {
        AttendanceSession session = authorizedSession(sessionId, actor);
        if (session.getCapturedPhotoPath() == null || session.getCapturedPhotoPath().isBlank()) {
            throw new IllegalStateException("No captured photo is stored for session " + sessionId);
        }
        Path path = Paths.get(session.getCapturedPhotoPath()).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            throw new IllegalStateException("Captured photo is missing for session " + sessionId);
        }
        try {
            MediaType mediaType = MediaType.parseMediaType(Files.probeContentType(path) == null
                    ? MediaType.APPLICATION_OCTET_STREAM_VALUE
                    : Files.probeContentType(path));
            return new PhotoFile(new FileSystemResource(path), mediaType);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read captured photo", e);
        }
    }

    @Transactional
    public AttendanceSession submitReview(Long sessionId, User actor, List<Map<String, Object>> decisions) {
        AttendanceSession session = authorizedSession(sessionId, actor);
        if (session.getStatus() != AttendanceSession.SessionStatus.REVIEW_REQUIRED) {
            throw new IllegalStateException("Session is not awaiting review");
        }

        Map<Long, String> decisionByStudent = new HashMap<>();
        for (Map<String, Object> decision : decisions) {
            Object studentId = decision.get("studentId");
            String value = String.valueOf(decision.get("decision")).toUpperCase();
            if (!(studentId instanceof Number) || !(value.equals("PRESENT") || value.equals("ABSENT"))) {
                throw new IllegalArgumentException("Each decision requires studentId and PRESENT or ABSENT");
            }
            decisionByStudent.put(((Number) studentId).longValue(), value);
        }

        for (AttendanceRecord record : session.getAttendanceRecords()) {
            if (record.getStatus() != AttendanceRecord.AttendanceStatus.REVIEW) {
                continue;
            }
            String decision = decisionByStudent.get(record.getStudent().getId());
            if (decision == null) {
                continue;
            }
            record.setStatus(AttendanceRecord.AttendanceStatus.valueOf(decision));
            record.setReviewStatus(AttendanceRecord.ReviewStatus.APPROVED);
            record.setReviewedBy(actor.getId());
            record.setReviewedAt(LocalDateTime.now());
        }

        boolean unresolved = session.getAttendanceRecords().stream()
                .anyMatch(record -> record.getStatus() == AttendanceRecord.AttendanceStatus.REVIEW);
        if (!unresolved) {
            session.setStatus(AttendanceSession.SessionStatus.FINALIZED);
            session.setEndedAt(LocalDateTime.now());
        }
        return sessionRepository.save(session);
    }

    private AttendanceSession authorizedSession(Long sessionId, User actor) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + sessionId));
        boolean admin = actor != null && actor.getRole() == User.Role.ADMIN;
        boolean owner = actor != null && session.getFaculty() != null
                && session.getFaculty().getId().equals(actor.getId());
        if (!admin && !owner) {
            throw new AccessDeniedException("You do not own this attendance session");
        }
        return session;
    }

    private List<Map<String, Object>> reviewRecords(AttendanceSession session) {
        List<Map<String, Object>> result = new ArrayList<>();
        session.getAttendanceRecords().stream()
                .filter(record -> record.getStatus() == AttendanceRecord.AttendanceStatus.REVIEW)
                .sorted(Comparator.comparing(record -> record.getStudent().getRollNumber()))
                .forEach(record -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("recordId", record.getId());
                    item.put("studentId", record.getStudent().getId());
                    item.put("rollNumber", record.getStudent().getRollNumber());
                    item.put("studentName", record.getStudent().getFirstName() + " " + record.getStudent().getLastName());
                    item.put("confidenceScore", record.getConfidenceScore());
                    item.put("status", record.getStatus().toString());
                    result.add(item);
                });
        return result;
    }

    public record PhotoFile(Resource resource, MediaType mediaType) {
    }
}
