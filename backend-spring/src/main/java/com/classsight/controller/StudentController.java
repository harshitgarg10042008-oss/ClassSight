package com.classsight.controller;

import com.classsight.entity.Student;
import com.classsight.entity.User;
import com.classsight.repository.StudentRepository;
import com.classsight.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/students")
public class StudentController {

    private static final Logger logger = LoggerFactory.getLogger(StudentController.class);

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.classsight.service.ImageUploadValidator imageUploadValidator;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${face-service.url}")
    private String faceServiceUrl;

    @PostMapping("/{rollNumber}/enroll")
    public ResponseEntity<?> enrollStudent(
            @PathVariable String rollNumber,
            @RequestParam("photo") MultipartFile photo,
            @RequestParam(name = "consentGiven", defaultValue = "false") boolean consentGiven,
            Principal authentication) {
        
        long startTime = System.currentTimeMillis();
        
        try {
            imageUploadValidator.validate(photo);
            if (!consentGiven) {
                return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "Explicit consentGiven=true is required for biometric enrollment"));
            }
            // Find student by roll number
            Student student = studentRepository.findByRollNumber(rollNumber)
                    .orElseThrow(() -> new RuntimeException("Student not found with roll number: " + rollNumber));

            // Prepare request to face service
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", photo.getResource());

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // Call face service /enroll endpoint
            String enrollUrl = faceServiceUrl + "/enroll";
            logger.info("Calling face service at: {}", enrollUrl);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(enrollUrl, requestEntity, Map.class);
            
            if (response.getStatusCode() != HttpStatus.OK) {
                return ResponseEntity.status(response.getStatusCode())
                        .body(response.getBody());
            }

            Map<String, Object> faceResponse = response.getBody();
            List<Double> embedding = (List<Double>) faceResponse.get("embedding");
            String message = (String) faceResponse.get("message");

            // Store embedding in student record
            student.setFaceEmbedding(embedding);
            student.addFaceEmbedding(embedding);
            User actor = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalStateException("Authenticated enrolling user not found"));
            student.setConsentGiven(true);
            student.setConsentedAt(java.time.LocalDateTime.now());
            student.setConsentedBy(actor);
            studentRepository.save(student);

            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            logger.info("✓ Enrollment completed for student: {} in {} ms", rollNumber, duration);
            logger.info("  - Face detection: {}", message);

            Map<String, Object> result = new HashMap<>();
            result.put("status", "success");
            result.put("message", "Student enrolled successfully");
            result.put("rollNumber", student.getRollNumber());
            result.put("studentId", student.getId());
            result.put("embeddingSize", embedding.size());
            result.put("enrollmentTimeMs", duration);

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", e.getMessage()));
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            
            logger.error("✗ Enrollment failed for student: {} after {} ms. Status: {}, Error: {}", rollNumber, duration, e.getStatusCode(), e.getResponseBodyAsString());
            
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            try {
                // Try to parse the JSON response from FastAPI
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                Map<String, Object> fastapiError = mapper.readValue(e.getResponseBodyAsString(), Map.class);
                if (fastapiError.containsKey("detail")) {
                    error.put("message", fastapiError.get("detail"));
                } else {
                    error.put("message", e.getResponseBodyAsString());
                }
            } catch (Exception parseException) {
                error.put("message", e.getResponseBodyAsString());
            }
            error.put("enrollmentTimeMs", duration);
            
            return ResponseEntity.status(e.getStatusCode()).body(error);
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            
            logger.error("✗ Enrollment failed for student: {} after {} ms. Error: {}", rollNumber, duration, e.getMessage());
            
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            error.put("enrollmentTimeMs", duration);
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Multi-angle enrollment via video clip (paper §2.4 protocol).
     *
     * The faculty/admin records a short video (~10 s) of the student slowly
     * turning their head left and right, covering the 5 head positions and
     * varying lighting described in the paper.  This endpoint extracts up to
     * 30 face embeddings from the video and stores each as a separate row in
     * student_face_embeddings — one embedding per frame sample.
     *
     * A single enrollment photo will NOT reach the paper's 97.5% accuracy;
     * this multi-angle video enrollment is required to replicate those numbers.
     *
     * Minimum enforced: 10 extracted embeddings (warn only; not a hard reject
     * so the UI can still save what was captured with a warning).
     */
    @PostMapping(value = "/{rollNumber}/enroll-video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> enrollStudentVideo(
            @PathVariable String rollNumber,
            @RequestParam("video") MultipartFile video,
            @RequestParam(name = "consentGiven", defaultValue = "false") boolean consentGiven,
            Principal authentication) {

        long startTime = System.currentTimeMillis();
        try {
            if (!consentGiven) {
                return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "Explicit consentGiven=true is required for biometric enrollment"));
            }
            if (video == null || video.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "No video file provided"));
            }

            Student student = studentRepository.findByRollNumber(rollNumber)
                    .orElseThrow(() -> new RuntimeException("Student not found: " + rollNumber));

            // Call face service /enroll-video
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("video", video.getResource());
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    faceServiceUrl + "/enroll-video", new HttpEntity<>(body, headers), Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            }

            Map<String, Object> faceResponse = response.getBody();
            @SuppressWarnings("unchecked")
            List<List<Double>> embeddings = (List<List<Double>>) faceResponse.get("embeddings");
            if (embeddings == null || embeddings.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "No face embeddings extracted from video. Ensure the student's face is clearly visible."));
            }

            // Store each frame embedding as a separate row (paper §2.4: ~30 images/student)
            // Clear existing embeddings so re-enrollment replaces the old set
            student.getFaceEmbeddings().clear();
            List<String> addedEmbeddings = new ArrayList<>();
            for (List<Double> emb : embeddings) {
                if (emb.size() == 128) {
                    student.addFaceEmbedding(emb);
                    addedEmbeddings.add("ok");
                }
            }
            // Set the primary embedding to the first extracted frame
            if (!embeddings.isEmpty()) {
                student.setFaceEmbedding(embeddings.get(0));
            }

            com.classsight.entity.User actor = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
            student.setConsentGiven(true);
            student.setConsentedAt(java.time.LocalDateTime.now());
            student.setConsentedBy(actor);
            studentRepository.save(student);

            long duration = System.currentTimeMillis() - startTime;
            logger.info("Video enrollment completed for {}: {} embeddings stored in {} ms",
                    rollNumber, addedEmbeddings.size(), duration);

            boolean belowTarget = addedEmbeddings.size() < 10;
            Map<String, Object> result = new HashMap<>();
            result.put("status", belowTarget ? "warning" : "success");
            result.put("message", belowTarget
                    ? String.format("Only %d embeddings extracted (target ≥30 for paper accuracy). Re-record with more head movement.", addedEmbeddings.size())
                    : String.format("%d face embeddings stored from video (paper target: ≥30).", addedEmbeddings.size()));
            result.put("rollNumber", student.getRollNumber());
            result.put("studentId", student.getId());
            result.put("embeddingsStored", addedEmbeddings.size());
            result.put("enrollmentTimeMs", duration);
            result.put("framesProcessed", faceResponse.get("frame_count"));
            result.put("faceServiceMessage", faceResponse.get("message"));
            return ResponseEntity.ok(result);

        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Video enrollment failed for {}: {}", rollNumber, e.getResponseBodyAsString());
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                Map<String, Object> detail = mapper.readValue(e.getResponseBodyAsString(), Map.class);
                error.put("message", detail.getOrDefault("detail", e.getResponseBodyAsString()));
            } catch (Exception ex) {
                error.put("message", e.getResponseBodyAsString());
            }
            error.put("enrollmentTimeMs", duration);
            return ResponseEntity.status(e.getStatusCode()).body(error);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Video enrollment failed for {}: {}", rollNumber, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    Map.of("status", "error", "message", e.getMessage(), "enrollmentTimeMs", duration));
        }
    }

    /**
     * Single-frame enrollment helper (for programmatic batch enrollment loops).
     * Identical to /enroll but named for clarity when used in a multi-frame flow.
     */
    @PostMapping(value = "/{rollNumber}/enroll-frame", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> enrollStudentFrame(
            @PathVariable String rollNumber,
            @RequestParam("photo") MultipartFile photo,
            @RequestParam(name = "consentGiven", defaultValue = "false") boolean consentGiven,
            @RequestParam(name = "replace", defaultValue = "false") boolean replace,
            Principal authentication) {

        long startTime = System.currentTimeMillis();
        try {
            imageUploadValidator.validate(photo);
            if (!consentGiven) {
                return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "Explicit consentGiven=true is required for biometric enrollment"));
            }
            Student student = studentRepository.findByRollNumber(rollNumber)
                    .orElseThrow(() -> new RuntimeException("Student not found: " + rollNumber));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", photo.getResource());
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    faceServiceUrl + "/enroll-frame", new HttpEntity<>(body, headers), Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            }
            Map<String, Object> faceResponse = response.getBody();
            @SuppressWarnings("unchecked")
            List<Double> embedding = (List<Double>) faceResponse.get("embedding");

            if (replace) {
                student.getFaceEmbeddings().clear();
                student.setFaceEmbedding(embedding);
            }
            student.addFaceEmbedding(embedding);
            if (student.getFaceEmbedding() == null) student.setFaceEmbedding(embedding);

            com.classsight.entity.User actor = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
            student.setConsentGiven(true);
            student.setConsentedAt(java.time.LocalDateTime.now());
            student.setConsentedBy(actor);
            studentRepository.save(student);

            long duration = System.currentTimeMillis() - startTime;
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Frame embedding added. Total embeddings: " + student.getFaceEmbeddings().size(),
                    "rollNumber", student.getRollNumber(),
                    "studentId", student.getId(),
                    "totalEmbeddings", student.getFaceEmbeddings().size(),
                    "enrollmentTimeMs", duration));
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Frame enrollment failed for {}: {}", rollNumber, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    Map.of("status", "error", "message", e.getMessage(), "enrollmentTimeMs", duration));
        }
    }
}
