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

    default List<StudentLeave> findApprovedLeaveOnDate(Long studentId, LocalDate targetDate) {
        return findLeavesOnDateByStatus(studentId, targetDate, StudentLeave.LeaveStatus.APPROVED);
    }

    @Query("""
        SELECT sl FROM StudentLeave sl
        WHERE sl.student.id = :studentId
          AND sl.status = :status
          AND sl.fromDate <= :targetDate
          AND sl.toDate >= :targetDate
    """)
    List<StudentLeave> findLeavesOnDateByStatus(@Param("studentId") Long studentId,
                                               @Param("targetDate") LocalDate targetDate,
                                               @Param("status") StudentLeave.LeaveStatus status);

    default List<StudentLeave> findApprovedLeavesBetween(Long studentId, LocalDate fromDate, LocalDate toDate) {
        return findLeavesBetweenByStatus(studentId, fromDate, toDate, StudentLeave.LeaveStatus.APPROVED);
    }

    @Query("""
        SELECT sl FROM StudentLeave sl
        WHERE sl.student.id = :studentId
          AND sl.status = :status
          AND sl.fromDate <= :toDate
          AND sl.toDate >= :fromDate
    """)
    List<StudentLeave> findLeavesBetweenByStatus(@Param("studentId") Long studentId,
                                                @Param("fromDate") LocalDate fromDate,
                                                @Param("toDate") LocalDate toDate,
                                                @Param("status") StudentLeave.LeaveStatus status);
}
