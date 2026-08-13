package com.classsight.repository;

import com.classsight.entity.AttendanceSession;
import com.classsight.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {

    List<AttendanceSession> findByFacultyOrderByCreatedAtDesc(User faculty);

    Optional<AttendanceSession> findFirstByFacultyOrderByCreatedAtDesc(User faculty);

    List<AttendanceSession> findByStatus(AttendanceSession.SessionStatus status);

    List<AttendanceSession> findByCreatedAtBeforeAndCapturedPhotoPathIsNotNull(LocalDateTime cutoff);

    List<AttendanceSession> findByClassSectionIdAndSubjectIdAndStatusAndStartedAtBetween(
            Long classSectionId,
            Long subjectId,
            AttendanceSession.SessionStatus status,
            LocalDateTime from,
            LocalDateTime to);
}
