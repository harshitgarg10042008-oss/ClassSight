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
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@SuppressWarnings("null")
public class AttendanceReviewService {

    private final AttendanceSessionRepository sessionRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;

    @Autowired
    public AttendanceReviewService(AttendanceSessionRepository sessionRepository, StorageService storageService,
            ObjectMapper objectMapper) {
        this.sessionRepository = sessionRepository;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
    }

    /** Compatibility constructor for focused unit tests that exercise local storage. */
    public AttendanceReviewService(AttendanceSessionRepository sessionRepository) {
        this(sessionRepository, new CapturePhotoStorageService("./data/captures"), new ObjectMapper());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getReview(Long sessionId, User actor) {
        AttendanceSession session = authorizedSession(sessionId, actor);
        List<Map<String, Object>> records = reviewRecords(session, true);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("status", session.getStatus().toString());
        response.put("capturePhase", session.getCapturePhase());
        response.put("capturedPhotoPath", session.getCapturedPhotoPath());
        response.put("photoUrl", "/api/attendance-sessions/" + sessionId + "/review/photo");
        List<String> photoPaths = photoPaths(session);
        response.put("photoUrls", java.util.stream.IntStream.range(0, photoPaths.size())
                .mapToObj(index -> "/api/attendance-sessions/" + sessionId + "/review/photo?index=" + index).toList());
        response.put("records", records);
        response.put("allRecords", reviewRecords(session, false));
        List<?> diagnostics = parseJsonArray(session.getRecognitionDiagnostics());
        response.put("diagnostics", diagnostics);
        response.put("unknownDetections", unknownDetections(diagnostics));
        response.put("unknownFacesReviewed", session.isUnknownFacesReviewed());
        response.put("finalizedBy", session.getFinalizedBy());
        response.put("finalizedAt", session.getFinalizedAt());
        response.put("timings", parseJsonObject(session.getRecognitionTimings()));
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
    public PhotoFile getPhoto(Long sessionId, User actor) { return getPhoto(sessionId, actor, 0); }

    @Transactional(readOnly = true)
    public PhotoFile getPhoto(Long sessionId, User actor, int index) {
        AttendanceSession session = authorizedSession(sessionId, actor);
        List<String> paths = photoPaths(session);
        if (index < 0 || index >= paths.size()) throw new IllegalArgumentException("Captured photo index is out of range");
        try {
            StorageService.StoredObject stored = storageService.read(paths.get(index));
            String contentType = stored.contentType() == null
                    ? MediaType.APPLICATION_OCTET_STREAM_VALUE : stored.contentType();
            return new PhotoFile(new ByteArrayResource(stored.bytes()), MediaType.parseMediaType(contentType));
        } catch (IOException e) {
            throw new IllegalStateException("Could not read captured photo", e);
        }
    }

    @Transactional
    public AttendanceSession submitReview(Long sessionId, User actor, List<Map<String, Object>> decisions) {
        return submitReview(sessionId, actor, decisions, List.of(), false);
    }

    @Transactional
    public AttendanceSession submitReview(Long sessionId, User actor, List<Map<String, Object>> decisions,
            List<Map<String, Object>> unknownAssignments, boolean acknowledgeUnknownFaces) {
        AttendanceSession session = authorizedSession(sessionId, actor);
        if (session.getStatus() != AttendanceSession.SessionStatus.REVIEW_REQUIRED) {
            throw new IllegalStateException("Session is not awaiting review");
        }

        List<?> diagnostics = parseJsonArray(session.getRecognitionDiagnostics());
        int unknownCount = unknownDetections(diagnostics);
        if (unknownCount > 0 && !acknowledgeUnknownFaces) {
            throw new IllegalArgumentException("Review unknown faces: explicitly acknowledge ignored faces or assign them to a roster student");
        }
        Map<Integer, Map<?, ?>> unknownByIndex = new HashMap<>();
        for (Object diagnostic : diagnostics) {
            if (!(diagnostic instanceof Map<?, ?> item)) continue;
            Object sid = item.get("student_id");
            if (!(sid instanceof Number) && Boolean.FALSE.equals(item.get("matched"))) {
                Object index = item.get("face_index");
                if (index instanceof Number number) unknownByIndex.put(number.intValue(), item);
            }
        }

        Map<Long, String> decisionByStudent = new HashMap<>();
        for (Map<String, Object> assignment : unknownAssignments) {
            Object index = assignment.get("faceIndex");
            Object studentId = assignment.get("studentId");
            if (!(index instanceof Number faceIndex) || !(studentId instanceof Number studentNumber)
                    || !unknownByIndex.containsKey(faceIndex.intValue())) {
                throw new IllegalArgumentException("Unknown-face assignment must reference a detected unknown face and an enrolled student");
            }
            long id = studentNumber.longValue();
            boolean belongsToSession = session.getAttendanceRecords().stream()
                    .anyMatch(record -> record.getStudent().getId().equals(id));
            if (!belongsToSession) throw new IllegalArgumentException("Assigned student is not enrolled in this class");
            if (decisionByStudent.put(id, "PRESENT") != null) throw new IllegalArgumentException("A student cannot be assigned to multiple detections");
        }
        for (Map<String, Object> decision : decisions) {
            Object studentId = decision.get("studentId");
            String value = String.valueOf(decision.get("decision")).toUpperCase();
            if (!(studentId instanceof Number) || !(value.equals("PRESENT") || value.equals("ABSENT"))) {
                throw new IllegalArgumentException("Each decision requires studentId and PRESENT or ABSENT");
            }
            Long id = ((Number) studentId).longValue();
            if (session.getAttendanceRecords().stream().noneMatch(record -> record.getStudent().getId().equals(id))) {
                throw new IllegalArgumentException("Attendance decision references a student outside this class");
            }
            String assigned = decisionByStudent.put(id, value);
            if (assigned != null && !assigned.equals(value)) throw new IllegalArgumentException("Conflicting faculty decisions for a student");
        }

        for (AttendanceRecord record : session.getAttendanceRecords()) {
            String decision = decisionByStudent.get(record.getStudent().getId());
            if (decision == null) continue;
            record.setStatus(AttendanceRecord.AttendanceStatus.valueOf(decision));
            record.setReviewStatus(AttendanceRecord.ReviewStatus.APPROVED);
            record.setReviewedBy(actor.getId());
            record.setReviewedAt(LocalDateTime.now());
        }

        if (unknownCount > 0) session.setUnknownFacesReviewed(true);
        boolean unresolved = session.getAttendanceRecords().stream()
                .anyMatch(record -> record.getStatus() == AttendanceRecord.AttendanceStatus.REVIEW);
        if (!unresolved && (unknownCount == 0 || session.isUnknownFacesReviewed())) {
            session.setStatus(AttendanceSession.SessionStatus.FINALIZED);
            LocalDateTime finalizedAt = LocalDateTime.now();
            session.setFinalizedBy(actor.getId());
            session.setFinalizedAt(finalizedAt);
            session.setEndedAt(finalizedAt);
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

    private int unknownDetections(List<?> diagnostics) {
        int count = 0;
        for (Object value : diagnostics) {
            if (value instanceof Map<?, ?> item && !(item.get("student_id") instanceof Number)
                    && Boolean.FALSE.equals(item.get("matched"))) count++;
        }
        return count;
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
                    item.put("studentName", (record.getStudent().getFirstName() + " " + record.getStudent().getLastName()).trim());
                    item.put("confidenceScore", record.getConfidenceScore());
                    item.put("recognitionState", record.getRecognitionState());
                    item.put("status", record.getStatus().toString());
                    item.put("qualityWarning", record.getQualityWarning());
                    item.put("faceSizeRatio", record.getFaceSizeRatio());
                    result.add(item);
                });
        return result;
    }

    private List<?> parseJsonArray(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(value, List.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored recognition diagnostics are invalid", e);
        }
    }

    private Map<?, ?> parseJsonObject(String value) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(value, Map.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored recognition timings are invalid", e);
        }
    }

    private List<String> photoPaths(AttendanceSession session) {
        if (session.getCapturedPhotoPaths() != null && !session.getCapturedPhotoPaths().isBlank())
            return java.util.Arrays.stream(session.getCapturedPhotoPaths().split("\\R"))
                    .filter(path -> !path.isBlank()).toList();
        return session.getCapturedPhotoPath() == null || session.getCapturedPhotoPath().isBlank()
                ? List.of() : List.of(session.getCapturedPhotoPath());
    }

    public record PhotoFile(Resource resource, MediaType mediaType) {
    }
}
