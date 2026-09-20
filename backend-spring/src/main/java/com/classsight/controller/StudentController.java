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

    @Autowired
    private com.classsight.repository.ClassSectionRepository classSectionRepository;

    @GetMapping
    public ResponseEntity<List<com.classsight.dto.StudentResponse>> listStudents(
            @RequestParam(required = false) Long classSectionId) {
        List<Student> students = classSectionId != null
                ? studentRepository.findByClassSectionId(classSectionId)
                : studentRepository.findAll();
        return ResponseEntity.ok(students.stream().map(com.classsight.dto.StudentResponse::new).toList());
    }

    @GetMapping(value = "/template.csv", produces = "text/csv")
    public ResponseEntity<byte[]> downloadCsvTemplate() {
        String csv = "roll_number,name\n" +
                "2501320100101,Aarav Sharma\n" +
                "2501320100102,Ananya Patel\n" +
                "2501320100103,Rohan Verma\n" +
                "2501320100104,Sneha Reddy\n" +
                "2501320100105,Vikram Singh\n";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"students-template.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @PostMapping("/enroll-single")
    public ResponseEntity<?> enrollSingle(
            @RequestParam("rollNumber") String rollNumber,
            @RequestParam("name") String name,
            @RequestParam(value = "classSectionId", required = false) Long classSectionId,
            @RequestParam("photo") MultipartFile photo,
            @RequestParam(name = "consentGiven", defaultValue = "false") boolean consentGiven,
            Principal authentication) {
        if (!consentGiven) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Biometric consent is required"));
        }
        try {
            imageUploadValidator.validate(photo);
            Student student = getOrCreateStudent(rollNumber.trim(), name.trim(), classSectionId);
            List<Double> embedding = callFaceServiceEnroll(photo.getBytes(), photo.getOriginalFilename());
            student.setFaceEmbedding(embedding);
            student.addFaceEmbedding(embedding);
            User actor = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new IllegalStateException("Authenticated enrolling user not found"));
            student.setConsentGiven(true);
            student.setConsentedAt(java.time.LocalDateTime.now());
            student.setConsentedBy(actor);
            studentRepository.save(student);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Student enrolled successfully",
                    "student", new com.classsight.dto.StudentResponse(student)
            ));
        } catch (Exception e) {
            logger.error("Single enrollment failed for {}: {}", rollNumber, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @PostMapping(value = "/bulk-enroll", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> bulkEnroll(
            @RequestParam("csvFile") MultipartFile csvFile,
            @RequestParam(value = "photos", required = false) List<MultipartFile> photoFiles,
            @RequestParam(value = "zipFile", required = false) MultipartFile zipFile,
            @RequestParam(value = "classSectionId", required = false) Long classSectionId,
            Principal authentication) {
        User actor = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

        try {
            // 1. Build map of photos: roll_number (lowercase) -> photo bytes
            Map<String, byte[]> photoMap = new HashMap<>();
            if (zipFile != null && !zipFile.isEmpty()) {
                extractZipPhotos(zipFile.getBytes(), photoMap);
            }
            if (photoFiles != null) {
                for (MultipartFile file : photoFiles) {
                    String original = file.getOriginalFilename();
                    if (original == null) continue;
                    if (original.toLowerCase().endsWith(".zip")) {
                        extractZipPhotos(file.getBytes(), photoMap);
                    } else {
                        String baseName = extractBaseName(original);
                        photoMap.put(baseName.toLowerCase(), file.getBytes());
                    }
                }
            }

            // 2. Parse CSV
            String csvContent = new String(csvFile.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
            String[] lines = csvContent.split("\\r?\\n");
            if (lines.length <= 1) {
                return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "CSV is empty or missing data rows"));
            }

            List<Map<String, Object>> results = new java.util.ArrayList<>();
            int succeeded = 0;
            int failed = 0;

            // Header check: skip line 0 if it contains "roll"
            int startIdx = lines[0].toLowerCase().contains("roll") ? 1 : 0;

            for (int i = startIdx; i < lines.length; i++) {
                String line = lines[i].trim();
                if (line.isBlank()) continue;
                String[] cols = line.split(",");
                if (cols.length < 2) continue;

                String roll = cols[0].trim();
                String name = cols[1].trim();
                Map<String, Object> rowResult = new HashMap<>();
                rowResult.put("rollNumber", roll);
                rowResult.put("name", name);

                byte[] photoBytes = photoMap.get(roll.toLowerCase());
                if (photoBytes == null) {
                    photoBytes = photoMap.get(roll.replaceAll("[^a-zA-Z0-9]", "").toLowerCase());
                }

                if (photoBytes == null) {
                    rowResult.put("success", false);
                    rowResult.put("message", "No matching photo found for roll number " + roll);
                    results.add(rowResult);
                    failed++;
                    continue;
                }

                try {
                    Student student = getOrCreateStudent(roll, name, classSectionId);
                    List<Double> embedding = callFaceServiceEnroll(photoBytes, roll + ".jpg");
                    student.setFaceEmbedding(embedding);
                    student.addFaceEmbedding(embedding);
                    student.setConsentGiven(true);
                    student.setConsentedAt(java.time.LocalDateTime.now());
                    student.setConsentedBy(actor);
                    studentRepository.save(student);

                    rowResult.put("success", true);
                    rowResult.put("message", "Enrolled successfully");
                    succeeded++;
                } catch (Exception ex) {
                    logger.warn("Enrollment failed for student {}: {}", roll, ex.getMessage());
                    rowResult.put("success", false);
                    rowResult.put("message", ex.getMessage());
                    failed++;
                }
                results.add(rowResult);
            }

            Map<String, Object> summary = new HashMap<>();
            summary.put("totalRows", succeeded + failed);
            summary.put("successCount", succeeded);
            summary.put("failureCount", failed);
            summary.put("results", results);
            return ResponseEntity.ok(summary);

        } catch (Exception e) {
            logger.error("Bulk enrollment error", e);
            return ResponseEntity.internalServerError().body(Map.of("status", "error", "message", "Bulk import failed: " + e.getMessage()));
        }
    }

    private Student getOrCreateStudent(String rollNumber, String fullName, Long classSectionId) {
        return studentRepository.findByRollNumber(rollNumber).orElseGet(() -> {
            Student s = new Student();
            s.setRollNumber(rollNumber);
            String[] parts = fullName.split("\\s+", 2);
            s.setFirstName(parts[0]);
            s.setLastName(parts.length > 1 ? parts[1] : "");
            s.setActive(true);

            com.classsight.entity.ClassSection section = null;
            if (classSectionId != null) {
                section = classSectionRepository.findById(classSectionId).orElse(null);
            }
            if (section == null) {
                section = classSectionRepository.findAll().stream().findFirst().orElse(null);
            }
            if (section == null) {
                throw new IllegalStateException("No ClassSection available. Seed class sections first.");
            }
            s.setClassSection(section);
            return s;
        });
    }

    private List<Double> callFaceServiceEnroll(byte[] photoBytes, String filename) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", new org.springframework.core.io.ByteArrayResource(photoBytes) {
            @Override
            public String getFilename() {
                return filename != null ? filename : "photo.jpg";
            }
        });
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        String enrollUrl = faceServiceUrl + "/enroll";
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(enrollUrl, requestEntity, Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Face service returned " + response.getStatusCode());
            }
            Map<String, Object> faceResponse = response.getBody();
            @SuppressWarnings("unchecked")
            List<Double> embedding = (List<Double>) faceResponse.get("embedding");
            if (embedding == null || embedding.isEmpty()) {
                throw new RuntimeException("Face service did not return embedding");
            }
            return embedding;
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            String resp = e.getResponseBodyAsString();
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                Map<?, ?> err = mapper.readValue(resp, Map.class);
                if (err.containsKey("detail")) throw new RuntimeException(String.valueOf(err.get("detail")));
            } catch (Exception ignored) {}
            throw new RuntimeException(resp.isBlank() ? e.getStatusText() : resp);
        }
    }

    private void extractZipPhotos(byte[] zipBytes, Map<String, byte[]> photoMap) throws java.io.IOException {
        try (java.util.zip.ZipInputStream zis = new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(zipBytes))) {
            java.util.zip.ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    String name = entry.getName();
                    String lower = name.toLowerCase();
                    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) {
                        String base = extractBaseName(name);
                        photoMap.put(base.toLowerCase(), zis.readAllBytes());
                    }
                }
                zis.closeEntry();
            }
        }
    }

    private String extractBaseName(String filename) {
        String name = filename;
        int lastSlash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (lastSlash >= 0) name = name.substring(lastSlash + 1);
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

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
