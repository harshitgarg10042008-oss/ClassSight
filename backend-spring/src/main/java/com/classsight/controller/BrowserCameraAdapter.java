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
import com.classsight.service.DiskMultipartFile;
import com.classsight.service.RtspCameraAdapter;
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
import java.nio.file.Path;

@RestController
@RequestMapping("/capture")
@CrossOrigin(origins = "*") // Allow CORS for testing from file:// or local server
public class BrowserCameraAdapter {

    private static final Logger logger = LoggerFactory.getLogger(BrowserCameraAdapter.class);

    @Autowired
    private AttendanceSessionService attendanceSessionService;

    @Autowired
    private com.classsight.service.AttendanceRecognitionService attendanceRecognitionService;

    @Autowired
    private com.classsight.service.CapturePhotoStorageService capturePhotoStorageService;

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

    @Autowired
    private RtspCameraAdapter rtspCameraAdapter;

    @Autowired
    private com.classsight.service.ImageUploadValidator imageUploadValidator;

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
            imageUploadValidator.validate(image);
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
                
                // Persist the original bytes before recognition so review can render
                // the exact captured image after this request completes.
                String capturedPhotoPath = capturePhotoStorageService.store(session.getId(), image);
                attendanceSessionService.setCapturedPhotoPath(session.getId(), capturedPhotoPath);

                attendanceSessionService.transitionToCaptured(session.getId());
                logger.info("Transitioned session {} to CAPTURED; photo stored at {}", session.getId(), capturedPhotoPath);
                
                // The uploaded image is still available here, so process it before
                // returning and persist one AttendanceRecord per enrolled student.
                AttendanceSession processedSession = attendanceRecognitionService
                        .processCapturedSession(session.getId(), image);
                logger.info("Processed session {} with status {}", processedSession.getId(), processedSession.getStatus());

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("message", "Image recognized and attendance records created successfully");
                response.put("sessionId", processedSession.getId());
                response.put("sessionStatus", processedSession.getStatus().toString());
                response.put("attendanceRecordCount", processedSession.getAttendanceRecords().size());
                response.put("capturedPhotoPath", processedSession.getCapturedPhotoPath());
                response.put("reviewUrl", "/api/attendance-sessions/" + processedSession.getId() + "/review");
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
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error processing capture", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to process capture"));
        }
    }

    @PostMapping(value = "/from-camera", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> captureFromCamera(@RequestBody Map<String, Long> payload, Authentication authentication) {
        try {
            Long roomId = payload.get("roomId");
            Long cameraId = payload.get("cameraId");
            Long assignmentId = payload.get("assignmentId");
            if (roomId == null || cameraId == null || assignmentId == null) return ResponseEntity.badRequest().body(Map.of("error", "roomId, cameraId, and assignmentId are required"));
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User faculty = userRepository.findByUsername(userDetails.getUsername()).orElseThrow(() -> new RuntimeException("Faculty user not found"));
            FacultySubjectAssignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
            Room room = roomRepository.findById(roomId).orElse(null);
            Camera camera = cameraRepository.findById(cameraId).orElse(null);
            if (assignment == null || room == null || camera == null) return ResponseEntity.badRequest().body(Map.of("error", "Invalid room, camera, or assignment"));
            RtspCameraAdapter.FrameResult frame = rtspCameraAdapter.captureFrame(cameraId);
            if (!frame.success()) return ResponseEntity.status(502).body(Map.of("error", frame.message(), "cameraId", cameraId, "latencyMs", frame.latencyMs()));
            AttendanceSession session = attendanceSessionService.createSession(faculty, room, camera, assignment.getSubject(), assignment.getClassSection());
            DiskMultipartFile diskFrame = new DiskMultipartFile(Path.of(frame.path()), "image/jpeg");
            String capturedPhotoPath = capturePhotoStorageService.store(session.getId(), diskFrame);
            attendanceSessionService.setCapturedPhotoPath(session.getId(), capturedPhotoPath);
            attendanceSessionService.transitionToCaptured(session.getId());
            AttendanceSession processed = attendanceRecognitionService.processCapturedSession(session.getId(), diskFrame);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("source", "RTSP_ADAPTER");
            response.put("sessionId", processed.getId());
            response.put("sessionStatus", processed.getStatus().toString());
            response.put("attendanceRecordCount", processed.getAttendanceRecords().size());
            response.put("capturedPhotoPath", processed.getCapturedPhotoPath());
            response.put("frameWidth", frame.width());
            response.put("frameHeight", frame.height());
            response.put("frameBytes", frame.bytes());
            response.put("frameLatencyMs", frame.latencyMs());
            response.put("reviewUrl", "/api/attendance-sessions/" + processed.getId() + "/review");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error processing camera-sourced capture", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to process camera capture: " + e.getMessage()));
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
