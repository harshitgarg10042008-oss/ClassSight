package com.classsight.service;

import com.classsight.entity.AttendanceSession;
import com.classsight.repository.AttendanceSessionRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.file.Path;

@Service
public class AsyncRecognitionService {
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceRecognitionService recognitionService;

    public AsyncRecognitionService(AttendanceSessionRepository sessionRepository,
                                   AttendanceRecognitionService recognitionService) {
        this.sessionRepository = sessionRepository;
        this.recognitionService = recognitionService;
    }

    @Async
    public void enqueue(Long sessionId, String objectKey) {
        try {
            recognitionService.processCapturedSession(sessionId, Path.of(objectKey));
        } catch (RuntimeException ex) {
            sessionRepository.findById(sessionId).ifPresent(session -> {
                session.setStatus(AttendanceSession.SessionStatus.FAILED);
                sessionRepository.save(session);
            });
        }
    }
}

