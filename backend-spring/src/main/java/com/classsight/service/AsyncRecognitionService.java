package com.classsight.service;

import com.classsight.entity.AttendanceSession;
import com.classsight.entity.RecognitionJob;
import com.classsight.repository.AttendanceSessionRepository;
import com.classsight.repository.RecognitionJobRepository;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class AsyncRecognitionService {
    private final AttendanceSessionRepository sessionRepository;
    private final RecognitionJobRepository jobRepository;
    private final RecognitionJobProcessor processor;

    public AsyncRecognitionService(AttendanceSessionRepository sessionRepository,
            RecognitionJobRepository jobRepository, RecognitionJobProcessor processor) {
        this.sessionRepository = sessionRepository;
        this.jobRepository = jobRepository;
        this.processor = processor;
    }

    public RecognitionJob enqueue(Long sessionId, String objectKey) {
        AttendanceSession session = sessionRepository.findById(Objects.requireNonNull(sessionId, "sessionId"))
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));
        RecognitionJob job = new RecognitionJob();
        job.setSession(session);
        job.setObjectKey(Objects.requireNonNull(objectKey, "objectKey"));
        job.setStatus(RecognitionJob.Status.QUEUED);
        RecognitionJob saved = jobRepository.save(job);
        processor.process(saved.getId(), sessionId, objectKey);
        return saved;
    }
}
