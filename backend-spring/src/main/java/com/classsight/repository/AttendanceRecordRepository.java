package com.classsight.repository;

import com.classsight.entity.AttendanceRecord;
import com.classsight.entity.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findByStudent_IdOrderByCreatedAtDesc(Long studentId);

    @Query("""
        SELECT ar FROM AttendanceRecord ar
        JOIN FETCH ar.session s
        JOIN FETCH s.subject sub
        WHERE ar.student.id = :studentId
          AND s.status = :sessionStatus
        ORDER BY s.startedAt DESC
        """)
    List<AttendanceRecord> findFinalizedRecordsForStudent(
            @Param("studentId") Long studentId,
            @Param("sessionStatus") AttendanceSession.SessionStatus sessionStatus);
}
