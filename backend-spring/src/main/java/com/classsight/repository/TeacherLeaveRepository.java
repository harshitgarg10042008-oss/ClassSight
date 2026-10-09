package com.classsight.repository;

import com.classsight.entity.TeacherLeave;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TeacherLeaveRepository extends JpaRepository<TeacherLeave, Long> {

    List<TeacherLeave> findByTeacher_IdOrderByFromDateDesc(Long teacherId);

    /** Find approved leaves that cover a specific date for a teacher */
    @Query("""
        SELECT tl FROM TeacherLeave tl
        WHERE tl.teacher.id = :teacherId
          AND tl.approved = TRUE
          AND tl.fromDate <= :date
          AND tl.toDate   >= :date
        """)
    List<TeacherLeave> findApprovedLeaveOnDate(@Param("teacherId") Long teacherId,
                                                @Param("date") LocalDate date);

    /** All approved leaves overlapping a date range */
    @Query("""
        SELECT tl FROM TeacherLeave tl
        WHERE tl.approved = TRUE
          AND tl.fromDate <= :to
          AND tl.toDate   >= :from
        ORDER BY tl.fromDate ASC
        """)
    List<TeacherLeave> findApprovedLeavesInRange(@Param("from") LocalDate from,
                                                  @Param("to") LocalDate to);
}
