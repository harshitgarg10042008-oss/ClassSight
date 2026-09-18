package com.classsight.service;

import com.classsight.entity.AttendanceRecord;
import com.classsight.entity.AttendanceSession;
import com.classsight.entity.Student;
import com.classsight.repository.AttendanceSessionRepository;
import com.classsight.repository.StudentRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.nio.file.Path;

@Service
public class AttendanceRecognitionService {

    private static final Logger logger = LoggerFactory.getLogger(AttendanceRecognitionService.class);

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final StudentRepository studentRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String faceServiceUrl;
    private final double distanceThreshold;
    private final Phase1SFaceService phase1SFaceService;
    private final boolean phase1Enabled;

    public AttendanceRecognitionService(
            AttendanceSessionRepository attendanceSessionRepository,
            StudentRepository studentRepository,
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${face-service.url:http://127.0.0.1:8000}") String faceServiceUrl,
            @Value("${attendance.recognition.threshold:0.6}") double distanceThreshold,
            Phase1SFaceService phase1SFaceService,
            @Value("${classsight.phase1.enabled:false}") boolean phase1Enabled) {
        this.attendanceSessionRepository = attendanceSessionRepository;
        this.studentRepository = studentRepository;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.faceServiceUrl = faceServiceUrl;
        this.distanceThreshold = distanceThreshold;
        this.phase1SFaceService = phase1SFaceService;
        this.phase1Enabled = phase1Enabled;
    }

    @Transactional
    public AttendanceSession processCapturedSession(Long sessionId, MultipartFile image) {
        Long requiredSessionId = Objects.requireNonNull(sessionId, "sessionId");
        AttendanceSession session = attendanceSessionRepository.findById(requiredSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + requiredSessionId));

        session.setStatus(AttendanceSession.SessionStatus.PROCESSING);
        List<Student> enrolledStudents = studentRepository.findByClassSectionAndActiveTrue(session.getClassSection());
        validateUniqueStudentIds(enrolledStudents);

        Map<String, Object> recognition = phase1Enabled
                ? recognizeWithSFace(image, enrolledStudents)
                : callRecognition(image, enrolledStudents);
        List<Map<String, Object>> matches = readMatches(recognition);
        Map<String, Object> quality = readQuality(recognition);
        boolean qualityPassed = Boolean.TRUE.equals(quality.get("quality_passed"));
        session.setBlurScore(decimalValue(quality.get("blur_score")));
        session.setBrightnessMean(decimalValue(quality.get("brightness_mean")));
        session.setLivenessScore(decimalValue(quality.get("liveness_score")));
        session.setQualityPassed(qualityPassed);
        List<String> globalQualityWarnings = stringList(quality.get("warnings"));
        session.setQualityWarning(globalQualityWarnings.isEmpty() ? null : String.join("; ", globalQualityWarnings));
        Set<Long> seenStudentIds = new HashSet<>();
        boolean requiresReview = !qualityPassed;

        session.getAttendanceRecords().clear();
        for (Student student : enrolledStudents) {
            Map<String, Object> match = findMatchForStudent(matches, student.getId(), seenStudentIds);
            AttendanceRecord record = new AttendanceRecord();
            record.setSession(session);
            record.setStudent(student);

            if (match == null) {
                record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
                record.setReviewStatus(AttendanceRecord.ReviewStatus.PENDING);
                record.setRecognitionState("UNKNOWN");
                record.setQualityWarning(globalQualityWarnings.isEmpty() ? "No enrolled face match"
                        : String.join("; ", globalQualityWarnings) + "; No enrolled face match");
                requiresReview = true;
            } else {
                double confidence = numericValue(match.get("confidence_score"));
                double distance = numericValue(match.get("distance"));
                boolean matched = phase1Enabled
                        ? Boolean.TRUE.equals(match.get("matched"))
                        : Boolean.TRUE.equals(match.get("matched")) && distance < distanceThreshold;
                record.setConfidenceScore(BigDecimal.valueOf(confidence).setScale(4, RoundingMode.HALF_UP));
                record.setFaceSizeRatio(decimalValue(match.get("face_size_ratio")));
                // Manhattan distance and confidence label (paper §2.3)
                record.setManhattanDistance(decimalValue(match.get("manhattan_distance")));
                record.setConfidenceLabel(String.valueOf(match.getOrDefault("confidence_label", "UNKNOWN")));
                boolean stateRequiresRecapture = "RECAPTURE_REQUIRED"
                        .equals(String.valueOf(match.getOrDefault("recognition_state", "")));
                record.setRecognitionState(String
                        .valueOf(match.getOrDefault("recognition_state", matched ? "RECOGNIZED" : "LOW_CONFIDENCE")));
                List<String> faceWarnings = stringList(match.get("quality_warnings"));
                List<String> warnings = mergeWarnings(globalQualityWarnings, faceWarnings);
                if (!matched) {
                    record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
                    record.setReviewStatus(AttendanceRecord.ReviewStatus.PENDING);
                    record.setQualityWarning(
                            warnings.isEmpty() ? "Low-confidence or unmatched face" : String.join("; ", warnings));
                    requiresReview = true;
                } else if (!qualityPassed || stateRequiresRecapture) {
                    record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
                    record.setReviewStatus(AttendanceRecord.ReviewStatus.PENDING);
                    record.setQualityWarning(String.join("; ", warnings));
                    requiresReview = true;
                } else {
                    record.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);
                    if (!warnings.isEmpty()) {
                        record.setQualityWarning(String.join("; ", warnings));
                    }
                }
            }
            session.getAttendanceRecords().add(record);
        }

        // Keep the local variable explicit: the map is also a guard against an
        // unexpected FastAPI match for a student outside this ClassSection.
        session.setStatus(requiresReview
                ? AttendanceSession.SessionStatus.REVIEW_REQUIRED
                : AttendanceSession.SessionStatus.FINALIZED);
        if (session.getStatus() == AttendanceSession.SessionStatus.FINALIZED
                || session.getStatus() == AttendanceSession.SessionStatus.REVIEW_REQUIRED) {
            session.setEndedAt(java.time.LocalDateTime.now());
        }
        AttendanceSession saved = attendanceSessionRepository.save(session);
        logger.info("Attendance session {} processed: {} students, status {}, threshold {}",
                sessionId, enrolledStudents.size(), saved.getStatus(), distanceThreshold);
        return saved;
    }

    /**
     * Applies a recognition response produced by either the synchronous HTTP path
     * or RabbitMQ worker.
     */
    @Transactional
    public AttendanceSession processRecognitionResult(Long sessionId, Map<String, Object> recognition) {
        Long requiredSessionId = Objects.requireNonNull(sessionId, "sessionId");
        AttendanceSession session = attendanceSessionRepository.findById(requiredSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + requiredSessionId));
        session.setStatus(AttendanceSession.SessionStatus.PROCESSING);
        List<Student> enrolledStudents = studentRepository.findByClassSectionAndActiveTrue(session.getClassSection());
        validateUniqueStudentIds(enrolledStudents);
        List<Map<String, Object>> matches = readMatches(recognition);
        Map<String, Object> quality = readQuality(recognition);
        boolean qualityPassed = Boolean.TRUE.equals(quality.get("quality_passed"));
        session.setBlurScore(decimalValue(quality.get("blur_score")));
        session.setBrightnessMean(decimalValue(quality.get("brightness_mean")));
        session.setLivenessScore(decimalValue(quality.get("liveness_score")));
        session.setQualityPassed(qualityPassed);
        List<String> globalQualityWarnings = stringList(quality.get("warnings"));
        session.setQualityWarning(globalQualityWarnings.isEmpty() ? null : String.join("; ", globalQualityWarnings));
        Set<Long> seenStudentIds = new HashSet<>();
        boolean requiresReview = !qualityPassed;
        session.getAttendanceRecords().clear();
        for (Student student : enrolledStudents) {
            Map<String, Object> match = findMatchForStudent(matches, student.getId(), seenStudentIds);
            AttendanceRecord record = new AttendanceRecord();
            record.setSession(session);
            record.setStudent(student);
            if (match == null) {
                record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
                record.setReviewStatus(AttendanceRecord.ReviewStatus.PENDING);
                record.setRecognitionState("UNKNOWN");
                record.setQualityWarning(globalQualityWarnings.isEmpty() ? "No enrolled face match"
                        : String.join("; ", globalQualityWarnings) + "; No enrolled face match");
                requiresReview = true;
            } else {
                double confidence = numericValue(match.get("confidence_score"));
                double distance = numericValue(match.get("distance"));
                boolean matched = Boolean.TRUE.equals(match.get("matched")) && distance < distanceThreshold;
                record.setConfidenceScore(BigDecimal.valueOf(confidence).setScale(4, RoundingMode.HALF_UP));
                record.setFaceSizeRatio(decimalValue(match.get("face_size_ratio")));
                // Manhattan distance and confidence label (paper §2.3)
                record.setManhattanDistance(decimalValue(match.get("manhattan_distance")));
                record.setConfidenceLabel(String.valueOf(match.getOrDefault("confidence_label", "UNKNOWN")));
                boolean stateRequiresRecapture = "RECAPTURE_REQUIRED"
                        .equals(String.valueOf(match.getOrDefault("recognition_state", "")));
                record.setRecognitionState(String
                        .valueOf(match.getOrDefault("recognition_state", matched ? "RECOGNIZED" : "LOW_CONFIDENCE")));
                List<String> faceWarnings = stringList(match.get("quality_warnings"));
                List<String> warnings = mergeWarnings(globalQualityWarnings, faceWarnings);
                if (!matched) {
                    record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
                    record.setReviewStatus(AttendanceRecord.ReviewStatus.PENDING);
                    record.setQualityWarning(
                            warnings.isEmpty() ? "Low-confidence or unmatched face" : String.join("; ", warnings));
                    requiresReview = true;
                } else if (!qualityPassed || stateRequiresRecapture) {
                    record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
                    record.setReviewStatus(AttendanceRecord.ReviewStatus.PENDING);
                    record.setQualityWarning(String.join("; ", warnings));
                    requiresReview = true;
                } else {
                    record.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);
                    if (!warnings.isEmpty())
                        record.setQualityWarning(String.join("; ", warnings));
                }
            }
            session.getAttendanceRecords().add(record);
        }
        session.setStatus(requiresReview ? AttendanceSession.SessionStatus.REVIEW_REQUIRED
                : AttendanceSession.SessionStatus.FINALIZED);
        session.setEndedAt(java.time.LocalDateTime.now());
        return attendanceSessionRepository.save(session);
    }

    public AttendanceSession processCapturedSession(Long sessionId, Path imagePath) {
        return processCapturedSession(sessionId, new DiskMultipartFile(imagePath, "image/jpeg"));
    }

    /**
     * Multi-frame session recognition with de-duplication (paper §2.5).
     *
     * Accepts a list of images captured over time during a class session, sends
     * them
     * to the face service /recognize-stream endpoint, which accumulates recognized
     * student IDs across all frames and returns one aggregated match per student.
     * This is the primary path for reaching the paper's 97.5% accuracy — a single
     * snapshot will miss students who are poorly angled or occluded in that frame.
     *
     * ACCURACY CAVEAT (paper §4): Best results require close-range captures
     * (browser webcam or mobile camera). Wide-angle CCTV at distance will yield
     * lower accuracy than the paper's published numbers.
     */
    @Transactional
    public AttendanceSession processMultiFrameSession(Long sessionId, List<MultipartFile> frames) {
        Long requiredSessionId = Objects.requireNonNull(sessionId, "sessionId");
        AttendanceSession session = attendanceSessionRepository.findById(requiredSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + requiredSessionId));
        session.setStatus(AttendanceSession.SessionStatus.PROCESSING);

        List<Student> enrolledStudents = studentRepository.findByClassSectionAndActiveTrue(session.getClassSection());
        validateUniqueStudentIds(enrolledStudents);

        // Encode frames as base64 strings for the JSON body
        List<String> frameB64 = new ArrayList<>();
        for (MultipartFile frame : frames) {
            try {
                frameB64.add(Base64.getEncoder().encodeToString(frame.getBytes()));
            } catch (IOException e) {
                logger.warn("Skipping unreadable frame: {}", e.getMessage());
            }
        }
        if (frameB64.isEmpty()) {
            throw new IllegalArgumentException("No readable frames provided");
        }

        // Build enrolled-students payload
        List<Map<String, Object>> studentsPayload = enrolledStudents.stream().map(student -> {
            Map<String, Object> item = new HashMap<>();
            item.put("student_id", student.getId());
            item.put("roll_number", student.getRollNumber());
            item.put("embedding", student.getFaceEmbedding());
            item.put("embeddings", embeddingsFor(student));
            return item;
        }).filter(item -> item.get("embedding") != null
                || (item.get("embeddings") instanceof List<?> refs && !refs.isEmpty())).toList();

        // Call /recognize-stream
        Map<String, Object> streamResult = callStreamRecognition(frameB64, studentsPayload);

        // The stream endpoint returns aggregated per-student matches (already
        // de-duplicated).
        // Build a studentId → match map from the response.
        List<Map<String, Object>> streamMatches = readMatches(streamResult);
        Map<Long, Map<String, Object>> matchByStudentId = new HashMap<>();
        for (Map<String, Object> m : streamMatches) {
            Object sid = m.get("student_id");
            if (sid instanceof Number n) {
                matchByStudentId.put(n.longValue(), m);
            }
        }

        boolean requiresReview = false;
        session.getAttendanceRecords().clear();

        for (Student student : enrolledStudents) {
            AttendanceRecord record = new AttendanceRecord();
            record.setSession(session);
            record.setStudent(student);
            Map<String, Object> match = matchByStudentId.get(student.getId());

            if (match == null) {
                // Not seen in any frame → review queue
                record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
                record.setReviewStatus(AttendanceRecord.ReviewStatus.PENDING);
                record.setRecognitionState("UNKNOWN");
                record.setConfidenceLabel("UNKNOWN");
                record.setQualityWarning("Not detected in any captured frame");
                requiresReview = true;
            } else {
                double confidence = numericValue(match.get("confidence_score"));
                double dist = numericValue(match.get("distance"));
                boolean matched = Boolean.TRUE.equals(match.get("matched")) && dist < distanceThreshold;
                record.setConfidenceScore(BigDecimal.valueOf(confidence).setScale(4, RoundingMode.HALF_UP));
                record.setManhattanDistance(decimalValue(match.get("manhattan_distance")));
                record.setConfidenceLabel(String.valueOf(match.getOrDefault("confidence_label", "UNKNOWN")));
                record.setRecognitionState(String
                        .valueOf(match.getOrDefault("recognition_state", matched ? "RECOGNIZED" : "LOW_CONFIDENCE")));
                if (!matched) {
                    record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
                    record.setReviewStatus(AttendanceRecord.ReviewStatus.PENDING);
                    record.setQualityWarning("Low-confidence match across "
                            + match.getOrDefault("frame_confirmations", 1) + " frame(s)");
                    requiresReview = true;
                } else {
                    record.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);
                }
            }
            session.getAttendanceRecords().add(record);
        }

        session.setStatus(requiresReview
                ? AttendanceSession.SessionStatus.REVIEW_REQUIRED
                : AttendanceSession.SessionStatus.FINALIZED);
        session.setEndedAt(java.time.LocalDateTime.now());
        AttendanceSession saved = attendanceSessionRepository.save(session);
        logger.info("Multi-frame session {} processed: {} frames, {} students, status {}",
                sessionId, frames.size(), enrolledStudents.size(), saved.getStatus());
        return saved;
    }

    private Map<String, Object> callStreamRecognition(List<String> frameB64,
            List<Map<String, Object>> studentsPayload) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("frames", frameB64);
            requestBody.put("enrolled_students", studentsPayload);
            requestBody.put("distance_threshold", distanceThreshold);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    faceServiceUrl + "/recognize-stream",
                    Objects.requireNonNull(HttpMethod.POST),
                    new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers),
                    new ParameterizedTypeReference<>() {
                    });
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new IllegalStateException("Face service /recognize-stream returned " + response.getStatusCode());
            }
            return response.getBody();
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize stream recognition request", e);
        } catch (RuntimeException e) {
            logger.error("Multi-frame recognition failed", e);
            throw new IllegalStateException("Multi-frame recognition failed: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> callRecognition(MultipartFile image, List<Student> enrolledStudents) {
        try {
            List<Map<String, Object>> payload = enrolledStudents.stream().map(student -> {
                Map<String, Object> item = new HashMap<>();
                item.put("student_id", student.getId());
                item.put("roll_number", student.getRollNumber());
                item.put("embedding", student.getFaceEmbedding());
                item.put("embeddings", embeddingsFor(student));
                return item;
            }).filter(item -> item.get("embedding") != null
                    || (item.get("embeddings") instanceof List<?> references && !references.isEmpty())).toList();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", image.getResource());
            body.add("enrolled_students", objectMapper.writeValueAsString(payload));
            body.add("distance_threshold", String.valueOf(distanceThreshold));

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    faceServiceUrl + "/recognize",
                    Objects.requireNonNull(HttpMethod.POST),
                    new HttpEntity<>(body, headers),
                    new ParameterizedTypeReference<>() {
                    });
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new IllegalStateException("Face service returned " + response.getStatusCode());
            }
            return response.getBody();
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize enrolled face embeddings", e);
        } catch (RuntimeException e) {
            logger.error("Face recognition failed for capture", e);
            throw new IllegalStateException("Face recognition failed: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> recognizeWithSFace(MultipartFile image, List<Student> enrolledStudents) {
        try {
            List<Phase1SFaceService.StudentReference> references = new ArrayList<>();
            for (Student student : enrolledStudents) {
                if (student.getFaceEmbeddingSface() != null && !student.getFaceEmbeddingSface().isEmpty()) {
                    references.add(phase1SFaceService.buildReference(student));
                }
            }
            Phase1SFaceService.SFaceRecognitionResponse response = phase1SFaceService.recognize(image, references);
            Map<String, Object> result = new HashMap<>();
            List<Map<String, Object>> matches = response.matches().stream().map(match -> {
                Map<String, Object> item = new HashMap<>();
                item.put("student_id", match.studentId());
                item.put("roll_number", match.rollNumber());
                item.put("matched", match.matched());
                item.put("confidence_score", match.confidenceScore());
                item.put("confidence_label", match.confidenceLabel());
                item.put("face_size_ratio", match.faceSizeRatio());
                item.put("quality_warnings", match.qualityWarnings());
                item.put("recognition_state", match.recognitionState());
                item.put("frame_confirmations", match.frameConfirmations());
                item.put("distance", 1.0 - match.confidenceScore());
                return item;
            }).toList();
            result.put("matches", matches);
            Map<String, Object> quality = new HashMap<>();
            quality.put("warnings", response.quality().warnings());
            double[] values = response.quality().quality();
            quality.put("blur_score", values.length > 0 ? values[0] : 0.0);
            quality.put("brightness_mean", values.length > 1 ? values[1] : 0.0);
            quality.put("liveness_score", values.length > 2 ? values[2] : 0.0);
            quality.put("face_size_ratio", values.length > 3 ? values[3] : 0.0);
            quality.put("quality_passed", response.quality().qualityPassed());
            result.put("quality", quality);
            return result;
        } catch (IOException e) {
            throw new IllegalStateException("SFace recognition failed for capture", e);
        }
    }

    private List<List<Double>> embeddingsFor(Student student) {
        List<List<Double>> embeddings = new java.util.ArrayList<>();
        if (student.getFaceEmbeddings() != null) {
            student.getFaceEmbeddings().forEach(reference -> {
                List<Double> embedding = reference.getEmbedding();
                if (embedding != null && embedding.size() == 128)
                    embeddings.add(embedding);
            });
        }
        if (embeddings.isEmpty() && student.getFaceEmbedding() != null && student.getFaceEmbedding().size() == 128) {
            embeddings.add(student.getFaceEmbedding());
        }
        return embeddings;
    }

    private Map<String, Object> readQuality(Map<String, Object> recognition) {
        Object rawQuality = recognition.get("quality");
        if (!(rawQuality instanceof Map<?, ?> map)) {
            throw new IllegalStateException("Face service response did not include quality metrics");
        }
        return stringKeyedMap(map);
    }

    private List<String> stringList(Object value) {
        if (!(value instanceof List<?> list))
            return new java.util.ArrayList<>();
        return list.stream().filter(String.class::isInstance).map(String.class::cast).toList();
    }

    private Double decimalValue(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private List<String> mergeWarnings(List<String> first, List<String> second) {
        java.util.LinkedHashSet<String> unique = new java.util.LinkedHashSet<>(first);
        unique.addAll(second);
        return new java.util.ArrayList<>(unique);
    }

    private List<Map<String, Object>> readMatches(Map<String, Object> recognition) {
        Object rawMatches = recognition.get("matches");
        if (!(rawMatches instanceof List<?> matches)) {
            throw new IllegalStateException("Face service response did not include matches");
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : matches) {
            if (item instanceof Map<?, ?> map)
                result.add(stringKeyedMap(map));
        }
        return result;
    }

    private Map<String, Object> stringKeyedMap(Map<?, ?> source) {
        Map<String, Object> result = new HashMap<>();
        for (Map.Entry<?, ?> entry : source.entrySet()) {
            if (entry.getKey() instanceof String key)
                result.put(key, entry.getValue());
        }
        return result;
    }

    private void validateUniqueStudentIds(List<Student> students) {
        Set<Long> ids = new HashSet<>();
        for (Student student : students) {
            Student nonNullStudent = Objects.requireNonNull(student, "enrolled student");
            Long id = Objects.requireNonNull(nonNullStudent.getId(), "enrolled student id");
            if (!ids.add(id))
                throw new IllegalStateException("Duplicate student IDs found in ClassSection");
        }
    }

    private Map<String, Object> findMatchForStudent(
            List<Map<String, Object>> matches, Long studentId, Set<Long> seenStudentIds) {
        for (Map<String, Object> match : matches) {
            Object rawStudentId = match.get("student_id");
            if (rawStudentId == null) {
                continue;
            }
            long candidateId = ((Number) rawStudentId).longValue();
            if (candidateId == studentId && seenStudentIds.add(studentId)) {
                return match;
            }
        }
        return null;
    }

    private double numericValue(Object value) {
        if (!(value instanceof Number number)) {
            throw new IllegalStateException("Face service returned a match without confidence_score");
        }
        return number.doubleValue();
    }
}
