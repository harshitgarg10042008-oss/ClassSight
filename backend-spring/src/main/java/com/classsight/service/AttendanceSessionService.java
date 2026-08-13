package com.classsight.service;

import com.classsight.entity.AttendanceSession;
import com.classsight.entity.Camera;
import com.classsight.entity.ClassSection;
import com.classsight.entity.Room;
import com.classsight.entity.Subject;
import com.classsight.entity.User;
import com.classsight.repository.AttendanceSessionRepository;
import com.classsight.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class AttendanceSessionService {

    private static final Logger logger = LoggerFactory.getLogger(AttendanceSessionService.class);

    @Autowired
    private AttendanceSessionRepository attendanceSessionRepository;

    @Autowired
    private UserRepository userRepository;

    public AttendanceSession createSession(User faculty, Room room, Camera camera, 
                                           Subject subject, ClassSection classSection) {
        logger.info("createSession called with faculty: {} (ID: {}), room: {}, camera: {}, subject: {}, class: {}", 
                faculty != null ? faculty.getUsername() : "null", 
                faculty != null ? faculty.getId() : "null",
                room != null ? room.getName() : "null",
                camera != null ? camera.getName() : "null",
                subject != null ? subject.getName() : "null",
                classSection != null ? classSection.getName() : "null");
        
        // Reload faculty entity to ensure it's attached to current persistence context
        User attachedFaculty = userRepository.findById(faculty.getId())
                .orElseThrow(() -> new RuntimeException("Faculty not found with ID: " + faculty.getId()));
        
        logger.info("Reloaded faculty: {} (ID: {})", attachedFaculty.getUsername(), attachedFaculty.getId());
        
        AttendanceSession session = new AttendanceSession();
        session.setFaculty(attachedFaculty);
        session.setRoom(room);
        session.setCamera(camera);
        session.setSubject(subject);
        session.setClassSection(classSection);
        session.setStatus(AttendanceSession.SessionStatus.OPEN);
        session.setStartedAt(LocalDateTime.now());
        
        logger.info("Session object before save - faculty: {}, room: {}, camera: {}", 
                session.getFaculty(), session.getRoom(), session.getCamera());
        
        AttendanceSession savedSession = attendanceSessionRepository.save(session);
        
        logger.info("Session saved with ID: {}, faculty ID: {}", savedSession.getId(), savedSession.getFaculty() != null ? savedSession.getFaculty().getId() : "null");
        
        return savedSession;
    }

    public Optional<AttendanceSession> getSessionById(Long id) {
        return attendanceSessionRepository.findById(id);
    }

    public Optional<AttendanceSession> getLatestSessionByFaculty(User faculty) {
        return attendanceSessionRepository.findFirstByFacultyOrderByCreatedAtDesc(faculty);
    }

    public List<AttendanceSession> getAllSessionsByFaculty(User faculty) {
        return attendanceSessionRepository.findByFacultyOrderByCreatedAtDesc(faculty);
    }

    public AttendanceSession updateStatus(Long sessionId, AttendanceSession.SessionStatus newStatus) {
        Optional<AttendanceSession> sessionOpt = attendanceSessionRepository.findById(sessionId);
        if (sessionOpt.isEmpty()) {
            throw new IllegalArgumentException("Session not found with id: " + sessionId);
        }
        
        AttendanceSession session = sessionOpt.get();
        session.setStatus(newStatus);
        
        if (newStatus == AttendanceSession.SessionStatus.FINALIZED || 
            newStatus == AttendanceSession.SessionStatus.CANCELLED ||
            newStatus == AttendanceSession.SessionStatus.FAILED) {
            session.setEndedAt(LocalDateTime.now());
        }
        
        return attendanceSessionRepository.save(session);
    }

    public AttendanceSession transitionToCaptured(Long sessionId) {
        return updateStatus(sessionId, AttendanceSession.SessionStatus.CAPTURED);
    }

    public AttendanceSession setCapturedPhotoPath(Long sessionId, String photoPath) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + sessionId));
        session.setCapturedPhotoPath(photoPath);
        return attendanceSessionRepository.save(session);
    }

    public AttendanceSession transitionToProcessing(Long sessionId) {
        return updateStatus(sessionId, AttendanceSession.SessionStatus.PROCESSING);
    }

    public AttendanceSession transitionToReviewRequired(Long sessionId) {
        return updateStatus(sessionId, AttendanceSession.SessionStatus.REVIEW_REQUIRED);
    }

    public AttendanceSession transitionToFinalized(Long sessionId) {
        return updateStatus(sessionId, AttendanceSession.SessionStatus.FINALIZED);
    }

    public AttendanceSession transitionToFailed(Long sessionId) {
        return updateStatus(sessionId, AttendanceSession.SessionStatus.FAILED);
    }

    public AttendanceSession transitionToCancelled(Long sessionId) {
        return updateStatus(sessionId, AttendanceSession.SessionStatus.CANCELLED);
    }
}
