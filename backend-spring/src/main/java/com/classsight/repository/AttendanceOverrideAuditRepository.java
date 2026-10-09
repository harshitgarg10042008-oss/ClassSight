package com.classsight.repository;

import com.classsight.entity.AttendanceOverrideAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceOverrideAuditRepository extends JpaRepository<AttendanceOverrideAudit, Long> {
    List<AttendanceOverrideAudit> findByStudent_IdOrderByCreatedAtDesc(Long studentId);
    List<AttendanceOverrideAudit> findBySession_IdOrderByCreatedAtDesc(Long sessionId);
}
