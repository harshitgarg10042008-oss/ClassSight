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
}
