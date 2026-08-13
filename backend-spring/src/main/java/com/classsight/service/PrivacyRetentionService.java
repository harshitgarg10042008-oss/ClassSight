package com.classsight.service;

import com.classsight.entity.AttendanceSession;
import com.classsight.repository.AttendanceSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PrivacyRetentionService {
    private final AttendanceSessionRepository sessionRepository;
    private final int retentionDays;

    public PrivacyRetentionService(
            AttendanceSessionRepository sessionRepository,
            @Value("${privacy.retention-days:30}") int retentionDays) {
        this.sessionRepository = sessionRepository;
        this.retentionDays = retentionDays;
    }

    @Scheduled(cron = "${privacy.retention-cron:0 0 3 * * *}")
    @Transactional
    public int deleteExpiredRawCaptures() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        List<AttendanceSession> sessions = sessionRepository
                .findByCreatedAtBeforeAndCapturedPhotoPathIsNotNull(cutoff);
        int deleted = 0;
        for (AttendanceSession session : sessions) {
            String rawPath = session.getCapturedPhotoPath();
            try {
                if (rawPath != null && Files.deleteIfExists(Path.of(rawPath))) {
                    deleted++;
                }
                // Keep the attendance session and records, but remove the retrievable raw path.
                session.setCapturedPhotoPath(null);
                sessionRepository.save(session);
            } catch (IOException | RuntimeException ignored) {
                // A missing or invalid path must not delete the attendance decision.
            }
        }
        return deleted;
    }

    public int retentionDays() {
        return retentionDays;
    }
}
