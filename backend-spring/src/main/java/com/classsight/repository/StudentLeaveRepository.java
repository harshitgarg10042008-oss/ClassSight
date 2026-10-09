package com.classsight.repository;

import com.classsight.entity.StudentLeave;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface StudentLeaveRepository extends JpaRepository<StudentLeave, Long> {
    List<StudentLeave> findByStudent_IdOrderByFromDateDesc(Long studentId);
    List<StudentLeave> findByStatusOrderByFromDateAsc(StudentLeave.LeaveStatus status);

    @Query("""
        SELECT sl FROM StudentLeave sl
        WHERE sl.student.id = :studentId
          AND sl.status = 'APPROVED'
          AND sl.fromDate <= :targetDate
          AND sl.toDate >= :targetDate
    """)
    List<StudentLeave> findApprovedLeaveOnDate(@Param("studentId") Long studentId,
                                              @Param("targetDate") LocalDate targetDate);

    @Query("""
        SELECT sl FROM StudentLeave sl
        WHERE sl.student.id = :studentId
          AND sl.status = 'APPROVED'
          AND sl.fromDate <= :toDate
          AND sl.toDate >= :fromDate
    """)
    List<StudentLeave> findApprovedLeavesBetween(@Param("studentId") Long studentId,
                                                @Param("fromDate") LocalDate fromDate,
                                                @Param("toDate") LocalDate toDate);
}
