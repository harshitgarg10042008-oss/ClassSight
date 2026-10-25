package com.classsight.service;

import com.classsight.entity.*;
import com.classsight.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Multi-Shot Attendance Service — Alniemi 2023 §2.5 implementation.
 *
 * The paper achieves 97.5% multi-face recognition by capturing MULTIPLE frames
 * over the course of a lecture and accumulating recognised identities across all
 * frames.  A student missed in one frame (wrong angle, poor lighting, blink) may
 * be successfully recognised in a later frame.  Only ONE attendance record per
 * student per session is kept — duplicates are de-duplicated here.
 *
 * Flow:
 *  1. Faculty opens a multi-shot session  → createMultiShotSession()
 *  2. Each frame captured/uploaded        → addFrame()
 *  3. Faculty closes session              → finaliseMultiShotSession()
 *
 * All records still flow through the standard review-gate: results below the
 * Manhattan threshold are marked REVIEW / PENDING so faculty can confirm them.
 */
@Service
public class MultiShotSessionService {

    private static final Logger logger = LoggerFactory.getLogger(MultiShotSessionService.class);

    /** In-memory accumulator: sessionId → { studentId → best AttendanceRecord so far } */
    private final ConcurrentHashMap<Long, Map<Long, AttendanceRecord>> accumulator = new ConcurrentHashMap<>();

    @Autowired
    private AttendanceSessionRepository attendanceSessionRepository;

    @Autowired
    private AttendanceRecognitionService recognitionService;

    @Autowired
    private AttendanceSessionService attendanceSessionService;

    @Autowired
    private StorageService capturePhotoStorageService;

    @Value("${attendance.recognition.threshold:15.0}")
    private double manhattanThreshold;

    /**
     * Register a new multi-shot session in the accumulator.
     * The AttendanceSession itself must already be created (status OPEN).
     */
    public void initSession(Long sessionId) {
        accumulator.put(sessionId, new ConcurrentHashMap<>());
        logger.info("Multi-shot accumulator initialised for session {}", sessionId);
    }

    /**
     * Process one frame from the session.
     *
     * Each frame is run through the full Haar+FaceNet+Manhattan pipeline.
     * Recognised faces are merged into the accumulator:
     *  - If a student was not yet seen, add them.
     *  - If already seen but this frame has a LOWER distance (better match), replace.
     *
     * @return number of unique students recognised so far in this session.
     */
    @Transactional
    public int addFrame(Long sessionId, MultipartFile frameImage) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        if (!accumulator.containsKey(sessionId)) {
            initSession(sessionId);
        }

        // Store the frame
        try {
            String path = capturePhotoStorageService.store(sessionId, frameImage);
            // Only update the captured photo path on the first frame
            if (session.getCapturedPhotoPath() == null || session.getCapturedPhotoPath().isBlank()) {
                attendanceSessionService.setCapturedPhotoPath(sessionId, path);
            }
        } catch (Exception e) {
            logger.warn("Could not store frame for session {}: {}", sessionId, e.getMessage());
        }

        // Run recognition on this frame
        AttendanceSession processed;
        try {
            processed = recognitionService.processCapturedSession(sessionId, frameImage);
        } catch (Exception e) {
            logger.warn("Frame recognition failed for session {}: {}", sessionId, e.getMessage());
            return accumulator.get(sessionId).size();
        }

        // Merge recognised records into accumulator
        Map<Long, AttendanceRecord> acc = accumulator.get(sessionId);
        for (AttendanceRecord record : processed.getAttendanceRecords()) {
            Long studentId = record.getStudent().getId();
            AttendanceRecord existing = acc.get(studentId);

            if (existing == null) {
                // First time seeing this student — add regardless of match quality
                acc.put(studentId, copyRecord(record, session));
            } else {
                // Already seen — replace only if this frame has a better confidence score
                // (lower Manhattan distance → higher confidence score)
                double newConf = record.getConfidenceScore() != null
                        ? record.getConfidenceScore().doubleValue() : 0.0;
                double existConf = existing.getConfidenceScore() != null
                        ? existing.getConfidenceScore().doubleValue() : 0.0;

                if (newConf > existConf) {
                    acc.put(studentId, copyRecord(record, session));
                    logger.debug("Session {}: improved match for student {} (conf {:.4f} → {:.4f})",
                            sessionId, studentId, existConf, newConf);
                }
            }
        }

        int uniqueRecognised = (int) acc.values().stream()
                .filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT)
                .count();
        logger.info("Session {}: frame processed — {} unique students recognised so far", sessionId, uniqueRecognised);
        return uniqueRecognised;
    }

    /**
     * Finalise the multi-shot session.
     *
     * De-duplicates: exactly ONE attendance record per student is persisted.
     * If any record is still in REVIEW state the session moves to REVIEW_REQUIRED,
     * otherwise it moves to FINALIZED — exactly as the single-shot pipeline does.
     */
    @Transactional
    public AttendanceSession finalise(Long sessionId) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        Map<Long, AttendanceRecord> acc = accumulator.getOrDefault(sessionId, Collections.emptyMap());

        if (acc.isEmpty()) {
            logger.warn("Session {}: no frames processed before finalise — marking REVIEW_REQUIRED", sessionId);
            session.setStatus(AttendanceSession.SessionStatus.REVIEW_REQUIRED);
            session.setEndedAt(LocalDateTime.now());
            session.setCapturePhase("DONE");
            return attendanceSessionRepository.save(session);
        }

        // Replace session records with the best-per-student de-duplicated set
        session.getAttendanceRecords().clear();
        boolean requiresReview = false;
        for (AttendanceRecord record : acc.values()) {
            record.setSession(session);
            session.getAttendanceRecords().add(record);
            if (record.getStatus() == AttendanceRecord.AttendanceStatus.REVIEW
                    || record.getReviewStatus() == AttendanceRecord.ReviewStatus.PENDING) {
                requiresReview = true;
            }
        }

        session.setStatus(requiresReview
                ? AttendanceSession.SessionStatus.REVIEW_REQUIRED
                : AttendanceSession.SessionStatus.FINALIZED);
        session.setEndedAt(LocalDateTime.now());
        session.setCapturePhase("DONE");

        accumulator.remove(sessionId);
        logger.info("Session {} finalised with {} unique student records (requiresReview={})",
                sessionId, acc.size(), requiresReview);
        return attendanceSessionRepository.save(session);
    }

    /** Discard accumulator state (e.g. session cancelled). */
    public void cancel(Long sessionId) {
        accumulator.remove(sessionId);
        logger.info("Multi-shot accumulator cleared for cancelled session {}", sessionId);
    }

    /** How many students have been recognised so far in this session. */
    public int recognisedCount(Long sessionId) {
        return (int) accumulator.getOrDefault(sessionId, Collections.emptyMap()).values().stream()
                .filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT)
                .count();
    }

    private AttendanceRecord copyRecord(AttendanceRecord src, AttendanceSession session) {
        AttendanceRecord copy = new AttendanceRecord();
        copy.setSession(session);
        copy.setStudent(src.getStudent());
        copy.setStatus(src.getStatus());
        copy.setReviewStatus(src.getReviewStatus());
        copy.setConfidenceScore(src.getConfidenceScore());
        copy.setFaceSizeRatio(src.getFaceSizeRatio());
        copy.setRecognitionState(src.getRecognitionState());
        copy.setQualityWarning(src.getQualityWarning());
        return copy;
    }
}
