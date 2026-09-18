package com.classsight.service;

import com.classsight.entity.AttendanceSession;
import com.classsight.entity.RecognitionJob;
import com.classsight.repository.AttendanceSessionRepository;
import com.classsight.repository.RecognitionJobRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class RecognitionJobServiceTest {
    @Test
    void enqueueCreatesQueuedJobAndDispatchesIt() {
        AttendanceSessionRepository sessions = mock(AttendanceSessionRepository.class);
        RecognitionJobRepository jobs = mock(RecognitionJobRepository.class, invocation -> {
            if ("save".equals(invocation.getMethod().getName())) {
                RecognitionJob job = invocation.getArgument(0);
                job.setId(7L);
                return job;
            }
            return org.mockito.Answers.RETURNS_DEFAULTS.answer(invocation);
        });
        RecognitionJobProcessor processor = mock(RecognitionJobProcessor.class);
        AttendanceSession session = new AttendanceSession();
        session.setId(44L);
        when(sessions.findById(44L)).thenReturn(Optional.of(session));
        RecognitionJob result = new AsyncRecognitionService(sessions, jobs, processor)
                .enqueue(44L, "C:/captures/session-44.jpg");

        assertEquals(7L, result.getId());
        assertEquals(RecognitionJob.Status.QUEUED, result.getStatus());
        verify(processor).process(7L, 44L, "C:/captures/session-44.jpg");
    }

    @Test
    void processorMarksCompletedRecognition() {
        RecognitionJobRepository jobs = mock(RecognitionJobRepository.class);
        AttendanceRecognitionService recognition = mock(AttendanceRecognitionService.class);
        RecognitionJob job = job(7L);
        when(jobs.findById(7L)).thenReturn(Optional.of(job));

        new RecognitionJobProcessor(jobs, recognition).process(7L, 44L, "C:/captures/session-44.jpg");

        assertEquals(RecognitionJob.Status.COMPLETE, job.getStatus());
        verify(recognition).processCapturedSession(44L, java.nio.file.Path.of("C:/captures/session-44.jpg"));
        verify(jobs, atLeast(2)).save(job);
    }

    @Test
    void processorMarksFailedRecognition() {
        RecognitionJobRepository jobs = mock(RecognitionJobRepository.class);
        AttendanceRecognitionService recognition = mock(AttendanceRecognitionService.class);
        RecognitionJob job = job(8L);
        when(jobs.findById(8L)).thenReturn(Optional.of(job));
        doThrow(new IllegalStateException("recognition unavailable"))
                .when(recognition).processCapturedSession(44L, java.nio.file.Path.of("C:/captures/session-44.jpg"));

        new RecognitionJobProcessor(jobs, recognition).process(8L, 44L, "C:/captures/session-44.jpg");

        assertEquals(RecognitionJob.Status.FAILED, job.getStatus());
        assertEquals("recognition unavailable", job.getErrorMessage());
        verify(jobs, atLeast(2)).save(job);
    }

    private RecognitionJob job(Long id) {
        RecognitionJob job = new RecognitionJob();
        job.setId(id);
        job.setStatus(RecognitionJob.Status.QUEUED);
        job.setObjectKey("C:/captures/session-44.jpg");
        return job;
    }
}
