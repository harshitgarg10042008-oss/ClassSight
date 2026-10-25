package com.classsight.controller;

import com.classsight.entity.AttendanceSession;
import com.classsight.entity.User;
import com.classsight.repository.UserRepository;
import com.classsight.service.AttendanceReviewService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance-sessions/{sessionId}/review")
public class AttendanceReviewController {

    private final AttendanceReviewService reviewService;
    private final UserRepository userRepository;

    public AttendanceReviewController(AttendanceReviewService reviewService, UserRepository userRepository) {
        this.reviewService = reviewService;
        this.userRepository = userRepository;
    }

    private User currentUser(Principal authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getReview(
            @PathVariable Long sessionId,
            Principal authentication) {
        return ResponseEntity.ok(reviewService.getReview(sessionId, currentUser(authentication)));
    }

    @GetMapping("/photo")
    public ResponseEntity<Resource> getPhoto(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "0") int index,
            Principal authentication) {
        AttendanceReviewService.PhotoFile photo = index == 0
                ? reviewService.getPhoto(sessionId, currentUser(authentication))
                : reviewService.getPhoto(sessionId, currentUser(authentication), index);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .contentType(photo.mediaType())
                .body(photo.resource());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> submitReview(
            @PathVariable Long sessionId,
            Principal authentication,
            @RequestBody Map<String, Object> payload) {
        Object rawDecisions = payload.get("decisions");
        List<Map<String, Object>> decisions = rawDecisions instanceof List<?> list
                ? list.stream().filter(Map.class::isInstance).map(item -> (Map<String, Object>) item).toList()
                : Collections.emptyList();
        Object rawUnknownAssignments = payload.get("unknownFaceAssignments");
        List<Map<String, Object>> unknownAssignments = rawUnknownAssignments instanceof List<?> list
                ? list.stream().filter(Map.class::isInstance).map(item -> (Map<String, Object>) item).toList()
                : Collections.emptyList();
        boolean acknowledgeUnknownFaces = Boolean.TRUE.equals(payload.get("acknowledgeUnknownFaces"));
        AttendanceSession session = reviewService.submitReview(sessionId, currentUser(authentication), decisions,
                unknownAssignments, acknowledgeUnknownFaces);
        return ResponseEntity.ok(Map.of(
                "sessionId", session.getId(),
                "status", session.getStatus().toString(),
                "unresolvedReviewCount", session.getAttendanceRecords().stream()
                        .filter(record -> record.getStatus() == com.classsight.entity.AttendanceRecord.AttendanceStatus.REVIEW)
                        .count(),
                "unknownFacesReviewed", session.isUnknownFacesReviewed(),
                "finalizedBy", session.getFinalizedBy() == null ? "" : session.getFinalizedBy(),
                "finalizedAt", session.getFinalizedAt() == null ? "" : session.getFinalizedAt().toString()));
    }
}
