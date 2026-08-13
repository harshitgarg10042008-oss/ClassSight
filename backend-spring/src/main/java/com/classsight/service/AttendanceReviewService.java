package com.classsight.service;

import com.classsight.entity.AttendanceRecord;
import com.classsight.entity.AttendanceSession;
import com.classsight.entity.User;
import com.classsight.repository.AttendanceSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AttendanceReviewService {

    private final AttendanceSessionRepository sessionRepository;
    private final StorageService storageService;

    @Autowired
    public AttendanceReviewService(AttendanceSessionRepository sessionRepository, StorageService storageService) {
        this.sessionRepository = sessionRepository;
        this.storageService = storageService;
    }

    /** Compatibility constructor for focused unit tests that exercise local storage. */
    public AttendanceReviewService(AttendanceSessionRepository sessionRepository) {
        this(sessionRepository, new CapturePhotoStorageService("./data/captures"));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getReview(Long sessionId, User actor) {
        AttendanceSession session = authorizedSession(sessionId, actor);
        List<Map<String, Object>> records = reviewRecords(session, true);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("status", session.getStatus().toString());
        response.put("capturedPhotoPath", session.getCapturedPhotoPath());
        response.put("photoUrl", "/api/attendance-sessions/" + sessionId + "/review/photo");
        response.put("records", records);
        response.put("allRecords", reviewRecords(session, false));
        Map<String, Object> quality = new HashMap<>();
        quality.put("blurScore", session.getBlurScore());
        quality.put("brightnessMean", session.getBrightnessMean());
        quality.put("livenessScore", session.getLivenessScore());
        quality.put("qualityPassed", session.getQualityPassed());
        quality.put("warning", session.getQualityWarning() == null ? "" : session.getQualityWarning());
        response.put("quality", quality);
        return response;
    }

    @Transactional(readOnly = true)
    public PhotoFile getPhoto(Long sessionId, User actor) {
        AttendanceSession session = authorizedSession(sessionId, actor);
        if (session.getCapturedPhotoPath() == null || session.getCapturedPhotoPath().isBlank()) {
            throw new IllegalStateException("No captured photo is stored for session " + sessionId);
        }
        try {
            StorageService.StoredObject stored = storageService.read(session.getCapturedPhotoPath());
            String contentType = stored.contentType() == null
                    ? MediaType.APPLICATION_OCTET_STREAM_VALUE : stored.contentType();
            return new PhotoFile(new ByteArrayResource(stored.bytes()), MediaType.parseMediaType(contentType));
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

    public void assertCanReview(Long sessionId, User actor) {
        authorizedSession(sessionId, actor);
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

    private List<Map<String, Object>> reviewRecords(AttendanceSession session, boolean onlyReview) {
        List<Map<String, Object>> result = new ArrayList<>();
        session.getAttendanceRecords().stream()
                .filter(record -> !onlyReview || record.getStatus() == AttendanceRecord.AttendanceStatus.REVIEW)
                .sorted(Comparator.comparing(record -> record.getStudent().getRollNumber()))
                .forEach(record -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("recordId", record.getId());
                    item.put("studentId", record.getStudent().getId());
                    item.put("rollNumber", record.getStudent().getRollNumber());
                    item.put("studentName", record.getStudent().getFirstName() + " " + record.getStudent().getLastName());
                    item.put("confidenceScore", record.getConfidenceScore());
                    item.put("recognitionState", record.getRecognitionState());
                    item.put("status", record.getStatus().toString());
                    item.put("qualityWarning", record.getQualityWarning());
                    item.put("faceSizeRatio", record.getFaceSizeRatio());
                    result.add(item);
                });
        return result;
    }

    public record PhotoFile(Resource resource, MediaType mediaType) {
    }
}
