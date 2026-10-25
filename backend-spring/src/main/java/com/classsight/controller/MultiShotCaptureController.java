package com.classsight.controller;

import com.classsight.entity.*;
import com.classsight.repository.*;
import com.classsight.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * Multi-Shot Capture Controller — Alniemi 2023 §2.5
 *
 * Implements the multi-frame attendance capture flow that enables the paper's 97.5%
 * multi-face recognition accuracy.  A single snapshot may miss students due to
 * occlusion, blink, or camera angle; multiple frames across the lecture ensure
 * each student is captured in at least one optimal pose.
 *
 * Endpoints:
 *   POST /api/capture/multi-shot/start        — open a multi-shot session
 *   POST /api/capture/multi-shot/{id}/frame   — add a frame to the session
 *   GET  /api/capture/multi-shot/{id}/status  — live progress (students recognised)
 *   POST /api/capture/multi-shot/{id}/finalise — close + de-duplicate + persist
 *   POST /api/capture/multi-shot/{id}/cancel  — discard session
 *
 * RTSP / IP-camera testing:
 *   The backend's existing POST /api/capture/from-camera endpoint (RtspCameraAdapter)
 *   still works and now feeds into the same Haar+FaceNet+Manhattan pipeline.
 *   For testing without physical CCTV hardware, run the free "IP Webcam" app
 *   (Android) or "iVCam" (iOS) and use the RTSP URL shown in the app:
 *     rtsp://<phone-ip>:8080/h264_ulaw.sdp   (IP Webcam Android)
 *   Register this URL as a Camera in ClassSight admin, then trigger
 *   POST /api/capture/from-camera with that cameraId.
 *
 * Distance / accuracy notes (paper §4.2):
 *   - Published 97.5% was measured close-range (12 MP, 26 mm, ~1–2 m from students).
 *   - Accuracy degrades with camera distance; CCTV at 5+ m will score lower.
 *   - Enrol students with 30 frames across 5 head angles + 3 lighting conditions
 *     to approach the paper's numbers (see POST /api/students/{id}/enroll-frame).
 */
@RestController
@RequestMapping("/capture/multi-shot")
public class MultiShotCaptureController {

    private static final Logger logger = LoggerFactory.getLogger(MultiShotCaptureController.class);

    @Autowired
    private MultiShotSessionService multiShotSessionService;

    @Autowired
    private AttendanceSessionService attendanceSessionService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private CameraRepository cameraRepository;

    @Autowired
    private com.classsight.repository.FacultySubjectAssignmentRepository assignmentRepository;

    @Autowired
    private ImageUploadValidator imageUploadValidator;

    // ── Start session ─────────────────────────────────────────────────────────

    /**
     * Open a new multi-shot attendance session.
     * Returns a sessionId that subsequent /frame and /finalise calls reference.
     */
    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startSession(
            @RequestParam Long roomId,
            @RequestParam Long cameraId,
            @RequestParam Long assignmentId,
            @RequestParam(defaultValue = "ATTENDANCE") AttendanceSession.SessionType sessionType,
            Authentication authentication) {
        try {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User faculty = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("Faculty user not found"));

            FacultySubjectAssignment assignment = assignmentRepository.findById(assignmentId)
                    .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));
            Room room = roomRepository.findById(roomId)
                    .orElseThrow(() -> new IllegalArgumentException("Room not found: " + roomId));
            Camera camera = cameraRepository.findById(cameraId)
                    .orElseThrow(() -> new IllegalArgumentException("Camera not found: " + cameraId));

            AttendanceSession session = attendanceSessionService.createSession(
                    faculty, room, camera,
                    assignment.getSubject(), assignment.getClassSection(),
                    sessionType);

            multiShotSessionService.initSession(session.getId());

            logger.info("Multi-shot session {} started by faculty {} for assignment {}",
                    session.getId(), faculty.getUsername(), assignmentId);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "sessionId", session.getId(),
                    "message", "Multi-shot session started. POST frames to /capture/multi-shot/" + session.getId() + "/frame",
                    "pipelineNote", "Haar Cascade + FaceNet + Manhattan L1 (Alniemi 2023 paper-aligned)"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Could not start multi-shot session", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Add frame ─────────────────────────────────────────────────────────────

    /**
     * Add a single frame (browser webcam snapshot or RTSP-extracted JPEG) to the session.
     *
     * The frame is run through the full Haar+FaceNet+Manhattan pipeline.
     * Recognised students are merged into the session accumulator.
     * Returns the current unique-recognised count (useful for a live progress bar).
     *
     * Call this repeatedly — e.g. one frame every 5–10 seconds — to ensure all
     * students in the room appear in at least one good-quality frame.
     */
    @PostMapping(value = "/{sessionId}/frame", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> addFrame(
            @PathVariable Long sessionId,
            @RequestParam("image") MultipartFile image,
            Authentication authentication) {
        try {
            imageUploadValidator.validate(image);
            int recognisedCount = multiShotSessionService.addFrame(sessionId, image);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "sessionId", sessionId,
                    "recognisedSoFar", recognisedCount,
                    "message", "Frame processed. " + recognisedCount + " student(s) recognised so far."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Frame processing failed for session {}", sessionId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Live status ───────────────────────────────────────────────────────────

    /** Returns the current recognised-student count without finalising. */
    @GetMapping("/{sessionId}/status")
    public ResponseEntity<Map<String, Object>> status(@PathVariable Long sessionId) {
        int count = multiShotSessionService.recognisedCount(sessionId);
        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "recognisedSoFar", count,
                "status", "IN_PROGRESS"
        ));
    }

    // ── Finalise ──────────────────────────────────────────────────────────────

    /**
     * Close the multi-shot session and persist one de-duplicated attendance record
     * per student.  Results below the Manhattan threshold are routed to faculty review.
     *
     * This is the paper's §2.5 de-duplication step: if the same student was recognised
     * in multiple frames, only the highest-confidence result is kept.
     */
    @PostMapping("/{sessionId}/finalise")
    public ResponseEntity<Map<String, Object>> finalise(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            AttendanceSession session = multiShotSessionService.finalise(sessionId);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("status", "success");
            response.put("sessionId", session.getId());
            response.put("sessionStatus", session.getStatus().toString());
            response.put("attendanceRecordCount", session.getAttendanceRecords().size());
            response.put("reviewUrl", "/api/attendance-sessions/" + session.getId() + "/review");
            response.put("message",
                    "Multi-shot session finalised. " + session.getAttendanceRecords().size()
                    + " unique student records persisted (de-duplicated across all frames).");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Finalise failed for session {}", sessionId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    /** Discard all accumulated frames and close the session as CANCELLED. */
    @PostMapping("/{sessionId}/cancel")
    public ResponseEntity<Map<String, Object>> cancel(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            multiShotSessionService.cancel(sessionId);
            attendanceSessionService.getSessionById(sessionId).ifPresent(s -> {
                s.setStatus(AttendanceSession.SessionStatus.CANCELLED);
                // Save via repo is handled by SessionService if available; otherwise caller handles
            });
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "sessionId", sessionId,
                    "message", "Multi-shot session cancelled and accumulator cleared."
            ));
        } catch (Exception e) {
            logger.error("Cancel failed for session {}", sessionId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
