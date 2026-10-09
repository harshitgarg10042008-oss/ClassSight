package com.classsight.repository;

import com.classsight.entity.ClassSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClassSessionRepository extends JpaRepository<ClassSession, Long> {

    /** All sessions for a given date */
    List<ClassSession> findByDateOrderByStartTimeAsc(LocalDate date);

    /** Sessions for a specific teacher on a date */
    List<ClassSession> findByDateAndTeacher_IdOrderByStartTimeAsc(LocalDate date, Long teacherId);

    /** Sessions for a section on a date */
    List<ClassSession> findByDateAndClassSection_IdOrderByStartTimeAsc(LocalDate date, Long sectionId);

    /** Find the current/next active period for a teacher at a given time */
    @Query("""
        SELECT cs FROM ClassSession cs
        WHERE cs.date = :date
          AND cs.teacher.id = :teacherId
          AND cs.status IN ('SCHEDULED', 'CONDUCTED')
          AND cs.startTime <= :now
          AND cs.endTime   >= :now
        ORDER BY cs.startTime ASC
        """)
    Optional<ClassSession> findCurrentPeriodForTeacher(
            @Param("date") LocalDate date,
            @Param("teacherId") Long teacherId,
            @Param("now") LocalTime now);

    /** Find next upcoming period for teacher (hasn't started yet) */
    @Query("""
        SELECT cs FROM ClassSession cs
        WHERE cs.date = :date
          AND cs.teacher.id = :teacherId
          AND cs.status IN ('SCHEDULED')
          AND cs.startTime > :now
        ORDER BY cs.startTime ASC
        """)
    List<ClassSession> findUpcomingPeriodsForTeacher(
            @Param("date") LocalDate date,
            @Param("teacherId") Long teacherId,
            @Param("now") LocalTime now);

    /** Find sessions sourced from a specific timetable slot on a date */
    Optional<ClassSession> findBySlot_IdAndDate(Long slotId, LocalDate date);

    /** SCHEDULED sessions in the past that need to be marked MISSED */
    @Query("""
        SELECT cs FROM ClassSession cs
        WHERE cs.status = 'SCHEDULED'
          AND (cs.date < :today
               OR (cs.date = :today AND cs.endTime < :now))
        """)
    List<ClassSession> findSessionsToMarkMissed(@Param("today") LocalDate today,
                                                 @Param("now") LocalTime now);

    /** Sessions by status for admin dashboard */
    List<ClassSession> findByDateBetweenAndStatusOrderByDateAscStartTimeAsc(
            LocalDate from, LocalDate to, ClassSession.SessionStatus status);

    /** All sessions for a date range (admin overview) */
    List<ClassSession> findByDateBetweenOrderByDateAscStartTimeAsc(LocalDate from, LocalDate to);

    /** Count of CONDUCTED or SUBSTITUTED sessions for subject and section in date range (used for analytics denominator) */
    @Query("""
        SELECT count(cs) FROM ClassSession cs
        WHERE cs.subject.id = :subjectId
          AND cs.classSection.id = :sectionId
          AND cs.date BETWEEN :from AND :to
          AND cs.status IN (
              com.classsight.entity.ClassSession.SessionStatus.CONDUCTED,
              com.classsight.entity.ClassSession.SessionStatus.SUBSTITUTED
          )
        """)
    long countConductedSessions(
            @Param("subjectId") Long subjectId,
            @Param("sectionId") Long sectionId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** Count of all timetable-generated sessions for subject and section in date range */
    @Query("""
        SELECT count(cs) FROM ClassSession cs
        WHERE cs.subject.id = :subjectId
          AND cs.classSection.id = :sectionId
          AND cs.date BETWEEN :from AND :to
        """)
    long countTotalSessions(
            @Param("subjectId") Long subjectId,
            @Param("sectionId") Long sectionId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** Matching class sessions for a teacher, subject, and room on a date */
    @Query("""
        SELECT cs FROM ClassSession cs
        WHERE cs.date = :date
          AND (cs.teacher.id = :teacherId OR (cs.substituteTeacher IS NOT NULL AND cs.substituteTeacher.id = :teacherId))
          AND cs.subject.id = :subjectId
          AND cs.room.id = :roomId
          AND cs.status IN (
              com.classsight.entity.ClassSession.SessionStatus.SCHEDULED,
              com.classsight.entity.ClassSession.SessionStatus.SUBSTITUTED,
              com.classsight.entity.ClassSession.SessionStatus.CONDUCTED
          )
        ORDER BY cs.startTime ASC
        """)
    List<ClassSession> findMatchingSessionsForCapture(
            @Param("date") LocalDate date,
            @Param("teacherId") Long teacherId,
            @Param("subjectId") Long subjectId,
            @Param("roomId") Long roomId);
}
