package com.classsight.repository;

import com.classsight.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findByStudent_IdOrderByCreatedAtDesc(Long studentId);

    default List<AttendanceRecord> findFinalizedRecordsForStudent(Long studentId) {
        return findRecordsForStudentByStatus(studentId, com.classsight.entity.AttendanceSession.SessionStatus.FINALIZED);
    }

    @Query("""
        SELECT ar FROM AttendanceRecord ar
        JOIN FETCH ar.session s
        JOIN FETCH s.subject sub
        WHERE ar.student.id = :studentId
          AND s.status = :status
        ORDER BY s.startedAt DESC
        """)
    List<AttendanceRecord> findRecordsForStudentByStatus(@Param("studentId") Long studentId,
                                                         @Param("status") com.classsight.entity.AttendanceSession.SessionStatus status);
}
