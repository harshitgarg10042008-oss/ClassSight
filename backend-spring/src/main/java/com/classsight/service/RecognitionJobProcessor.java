package com.classsight.service;

import com.classsight.entity.RecognitionJob;
import com.classsight.repository.RecognitionJobRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
public class RecognitionJobProcessor {
    private final RecognitionJobRepository jobRepository;
    private final AttendanceRecognitionService recognitionService;

    public RecognitionJobProcessor(RecognitionJobRepository jobRepository,
            AttendanceRecognitionService recognitionService) {
        this.jobRepository = jobRepository;
        this.recognitionService = recognitionService;
    }

    @Async
    @Transactional
    public void process(Long jobId, Long sessionId, String objectKey) {
        RecognitionJob job = jobRepository.findById(Objects.requireNonNull(jobId, "jobId"))
                .orElseThrow(() -> new IllegalArgumentException("Recognition job not found: " + jobId));
        job.setStatus(RecognitionJob.Status.PROCESSING);
        job.setStartedAt(LocalDateTime.now());
        jobRepository.save(job);
        try {
            recognitionService.processCapturedSession(Objects.requireNonNull(sessionId, "sessionId"),
                    Path.of(objectKey));
            job.setStatus(RecognitionJob.Status.COMPLETE);
            job.setCompletedAt(LocalDateTime.now());
            jobRepository.save(job);
        } catch (RuntimeException ex) {
            job.setStatus(RecognitionJob.Status.FAILED);
            job.setErrorMessage(ex.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            jobRepository.save(job);
        }
    }
}
