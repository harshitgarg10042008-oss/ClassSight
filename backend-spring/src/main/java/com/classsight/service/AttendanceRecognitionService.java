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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.nio.file.Path;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AttendanceRecognitionService {

    private static final Logger logger = LoggerFactory.getLogger(AttendanceRecognitionService.class);

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final StudentRepository studentRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String faceServiceUrl;
    private final double distanceThreshold;

    public AttendanceRecognitionService(
            AttendanceSessionRepository attendanceSessionRepository,
            StudentRepository studentRepository,
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${face-service.url}") String faceServiceUrl,
            @Value("${attendance.recognition.threshold:0.6}") double distanceThreshold) {
        this.attendanceSessionRepository = attendanceSessionRepository;
        this.studentRepository = studentRepository;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.faceServiceUrl = faceServiceUrl;
        this.distanceThreshold = distanceThreshold;
    }

    @Transactional
    public AttendanceSession processCapturedSession(Long sessionId, MultipartFile image) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + sessionId));

        session.setStatus(AttendanceSession.SessionStatus.PROCESSING);
        List<Student> enrolledStudents = studentRepository.findByClassSectionAndActiveTrue(session.getClassSection());
        Map<Long, Student> studentsById = enrolledStudents.stream()
                .collect(Collectors.toMap(Student::getId, Function.identity()));

        Map<String, Object> recognition = callRecognition(image, enrolledStudents);
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
                record.setQualityWarning(globalQualityWarnings.isEmpty() ? "No enrolled face match" : String.join("; ", globalQualityWarnings) + "; No enrolled face match");
                requiresReview = true;
            } else {
                double confidence = numericValue(match.get("confidence_score"));
                double distance = numericValue(match.get("distance"));
                boolean matched = Boolean.TRUE.equals(match.get("matched")) && distance < distanceThreshold;
                record.setConfidenceScore(BigDecimal.valueOf(confidence).setScale(4, RoundingMode.HALF_UP));
                record.setFaceSizeRatio(decimalValue(match.get("face_size_ratio")));
                List<String> faceWarnings = stringList(match.get("quality_warnings"));
                List<String> warnings = mergeWarnings(globalQualityWarnings, faceWarnings);
                if (!matched) {
                    record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
                    record.setReviewStatus(AttendanceRecord.ReviewStatus.PENDING);
                    record.setQualityWarning(warnings.isEmpty() ? "Low-confidence or unmatched face" : String.join("; ", warnings));
                    requiresReview = true;
                } else if (!qualityPassed) {
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
        if (studentsById.size() != enrolledStudents.size()) {
            throw new IllegalStateException("Duplicate student IDs found in ClassSection");
        }

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

    public AttendanceSession processCapturedSession(Long sessionId, Path imagePath) {
        return processCapturedSession(sessionId, new DiskMultipartFile(imagePath, "image/jpeg"));
    }

    private Map<String, Object> callRecognition(MultipartFile image, List<Student> enrolledStudents) {
        try {
            List<Map<String, Object>> payload = enrolledStudents.stream().map(student -> {
                Map<String, Object> item = new HashMap<>();
                item.put("student_id", student.getId());
                item.put("roll_number", student.getRollNumber());
                item.put("embedding", student.getFaceEmbedding());
                return item;
            }).filter(item -> item.get("embedding") != null).toList();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", image.getResource());
            body.add("enrolled_students", objectMapper.writeValueAsString(payload));
            body.add("distance_threshold", String.valueOf(distanceThreshold));

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    faceServiceUrl + "/recognize",
                    HttpMethod.POST,
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

    @SuppressWarnings("unchecked")
    private Map<String, Object> readQuality(Map<String, Object> recognition) {
        Object rawQuality = recognition.get("quality");
        if (!(rawQuality instanceof Map<?, ?> map)) {
            throw new IllegalStateException("Face service response did not include quality metrics");
        }
        return (Map<String, Object>) map;
    }

    @SuppressWarnings("unchecked")
    private List<String> stringList(Object value) {
        if (!(value instanceof List<?> list)) return new java.util.ArrayList<>();
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

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> readMatches(Map<String, Object> recognition) {
        Object rawMatches = recognition.get("matches");
        if (!(rawMatches instanceof List<?>)) {
            throw new IllegalStateException("Face service response did not include matches");
        }
        return ((List<?>) rawMatches).stream()
                .filter(Map.class::isInstance)
                .map(item -> (Map<String, Object>) item)
                .toList();
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
