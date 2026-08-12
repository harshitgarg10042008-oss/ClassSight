package com.classsight.controller;

import com.classsight.entity.AttendanceSession;
import com.classsight.entity.Camera;
import com.classsight.entity.ClassSection;
import com.classsight.entity.FacultySubjectAssignment;
import com.classsight.entity.Room;
import com.classsight.entity.Subject;
import com.classsight.entity.User;
import com.classsight.repository.CameraRepository;
import com.classsight.repository.ClassSectionRepository;
import com.classsight.repository.FacultySubjectAssignmentRepository;
import com.classsight.repository.RoomRepository;
import com.classsight.repository.SubjectRepository;
import com.classsight.repository.UserRepository;
import com.classsight.service.AttendanceSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/capture")
@CrossOrigin(origins = "*") // Allow CORS for testing from file:// or local server
public class BrowserCameraAdapter {

    private static final Logger logger = LoggerFactory.getLogger(BrowserCameraAdapter.class);

    @Autowired
    private AttendanceSessionService attendanceSessionService;

    @Autowired
    private FacultySubjectAssignmentRepository assignmentRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private CameraRepository cameraRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ClassSectionRepository classSectionRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> uploadCaptureMultipart(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "roomId", required = false) Long roomId,
            @RequestParam(value = "cameraId", required = false) Long cameraId,
            @RequestParam(value = "assignmentId", required = false) Long assignmentId,
            org.springframework.security.core.Authentication authentication) {
        
        logger.info("Received capture via multipart. Size: {} bytes, ContentType: {}, RoomId: {}, CameraId: {}, AssignmentId: {}", 
                image.getSize(), image.getContentType(), roomId, cameraId, assignmentId);
        
        try {
            // Extract faculty from authentication
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User faculty = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("Faculty user not found"));
            
            logger.info("Extracted faculty: {} (ID: {})", faculty.getUsername(), faculty.getId());
            
            // Create AttendanceSession with OPEN status
            if (roomId != null && cameraId != null && assignmentId != null) {
                Optional<FacultySubjectAssignment> assignmentOpt = assignmentRepository.findById(assignmentId);
                Optional<Room> roomOpt = roomRepository.findById(roomId);
                Optional<Camera> cameraOpt = cameraRepository.findById(cameraId);
                
                logger.info("Assignment found: {}, Room found: {}, Camera found: {}", 
                        assignmentOpt.isPresent(), roomOpt.isPresent(), cameraOpt.isPresent());
                
                if (assignmentOpt.isEmpty() || roomOpt.isEmpty() || cameraOpt.isEmpty()) {
                    logger.error("Invalid context: assignment={}, room={}, camera={}", 
                            assignmentOpt.isPresent(), roomOpt.isPresent(), cameraOpt.isPresent());
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid room, camera, or assignment"));
                }
                
                FacultySubjectAssignment assignment = assignmentOpt.get();
                Room room = roomOpt.get();
                Camera camera = cameraOpt.get();
                Subject subject = assignment.getSubject();
                ClassSection classSection = assignment.getClassSection();
                
                logger.info("Creating session with faculty ID: {}, room ID: {}, camera ID: {}, subject ID: {}, class ID: {}", 
                        faculty.getId(), room.getId(), camera.getId(), subject.getId(), classSection.getId());
                
                // Create session with OPEN status
                AttendanceSession session = attendanceSessionService.createSession(
                        faculty, room, camera, subject, classSection);
                
                logger.info("Created AttendanceSession with ID: {}, Status: OPEN", session.getId());
                
                // Transition to CAPTURED (photo saved)
                attendanceSessionService.transitionToCaptured(session.getId());
                logger.info("Transitioned session {} to CAPTURED", session.getId());
                
                // Transition to PROCESSING (sent for recognition - placeholder)
                attendanceSessionService.transitionToProcessing(session.getId());
                logger.info("Transitioned session {} to PROCESSING", session.getId());
                
                // Transition to REVIEW_REQUIRED (placeholder for recognition result)
                attendanceSessionService.transitionToReviewRequired(session.getId());
                logger.info("Transitioned session {} to REVIEW_REQUIRED (placeholder)", session.getId());
                
                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("message", "Image received and session created successfully");
                response.put("sessionId", session.getId());
                response.put("sessionStatus", "REVIEW_REQUIRED");
                response.put("size", image.getSize());
                response.put("contentType", image.getContentType());
                
                return ResponseEntity.ok(response);
            } else {
                // Fallback: just receive image without session creation
                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("message", "Image received via multipart successfully (no session created)");
                response.put("size", image.getSize());
                response.put("contentType", image.getContentType());
                
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            logger.error("Error processing capture", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to process capture: " + e.getMessage()));
        }
    }

    @PostMapping(consumes = "application/json")
    public ResponseEntity<Map<String, Object>> uploadCaptureBase64(@RequestBody Map<String, String> payload) {
        String base64Image = payload.get("image");
        if (base64Image == null || base64Image.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing image data"));
        }
        
        logger.info("Received capture via base64 JSON. Length: {} chars", base64Image.length());
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Image received via base64 successfully");
        response.put("length", base64Image.length());
        
        return ResponseEntity.ok(response);
    }
}
