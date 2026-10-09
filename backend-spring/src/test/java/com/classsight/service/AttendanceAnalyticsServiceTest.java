package com.classsight.service;

import com.classsight.entity.*;
import com.classsight.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AttendanceAnalyticsServiceTest {

    private AttendanceSessionRepository sessionRepo;
    private FacultySubjectAssignmentRepository assignmentRepo;
    private ClassSessionRepository classSessionRepo;
    private StudentLeaveRepository studentLeaveRepo;
    private AttendanceAnalyticsService analyticsService;

    private User teacher;
    private Student student1;
    private Student student2;

    @BeforeEach
    void setUp() {
        sessionRepo = mock(AttendanceSessionRepository.class);
        assignmentRepo = mock(FacultySubjectAssignmentRepository.class);
        classSessionRepo = mock(ClassSessionRepository.class);
        studentLeaveRepo = mock(StudentLeaveRepository.class);

        analyticsService = new AttendanceAnalyticsService(
                sessionRepo, assignmentRepo, classSessionRepo, studentLeaveRepo, 75.0);

        teacher = new User();
        teacher.setId(1L);
        teacher.setRole(User.Role.ADMIN); // admin bypasses assignment check

        student1 = new Student();
        student1.setId(10L);
        student1.setRollNumber("DEMO001");
        student1.setFirstName("Alice");
        student1.setLastName("Smith");

        student2 = new Student();
        student2.setId(20L);
        student2.setRollNumber("DEMO002");
        student2.setFirstName("Bob");
        student2.setLastName("Jones");
    }

    @Test
    void testCancelledSessionsDoNotLowerAttendancePercentage() {
        // Conducted session 1: Alice present, Bob absent
        AttendanceSession session1 = new AttendanceSession();
        session1.setId(1L);
        session1.setStatus(AttendanceSession.SessionStatus.FINALIZED);
        session1.setStartedAt(LocalDateTime.of(2026, 10, 1, 9, 0));

        ClassSession cs1 = new ClassSession();
        cs1.setStatus(ClassSession.SessionStatus.CONDUCTED);
        session1.setClassSession(cs1);

        AttendanceRecord r1A = new AttendanceRecord();
        r1A.setStudent(student1);
        r1A.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);

        AttendanceRecord r1B = new AttendanceRecord();
        r1B.setStudent(student2);
        r1B.setStatus(AttendanceRecord.AttendanceStatus.ABSENT);

        session1.setAttendanceRecords(java.util.Set.of(r1A, r1B));

        // Session 2 is CANCELLED: Alice and Bob had records (or shouldn't be counted)
        AttendanceSession session2 = new AttendanceSession();
        session2.setId(2L);
        session2.setStatus(AttendanceSession.SessionStatus.FINALIZED);
        session2.setStartedAt(LocalDateTime.of(2026, 10, 2, 9, 0));

        ClassSession cs2 = new ClassSession();
        cs2.setStatus(ClassSession.SessionStatus.CANCELLED);
        cs2.setReason("Teacher on leave");
        session2.setClassSession(cs2);

        AttendanceRecord r2A = new AttendanceRecord();
        r2A.setStudent(student1);
        r2A.setStatus(AttendanceRecord.AttendanceStatus.ABSENT);

        AttendanceRecord r2B = new AttendanceRecord();
        r2B.setStudent(student2);
        r2B.setStatus(AttendanceRecord.AttendanceStatus.ABSENT);

        session2.setAttendanceRecords(java.util.Set.of(r2A, r2B));

        when(sessionRepo.findByClassSectionIdAndSubjectIdAndStatusAndStartedAtBetween(
                eq(1L), eq(1L), eq(AttendanceSession.SessionStatus.FINALIZED), any(), any()))
                .thenReturn(List.of(session1, session2));

        when(classSessionRepo.countConductedSessions(eq(1L), eq(1L), any(), any()))
                .thenReturn(1L);

        Map<String, Object> result = analyticsService.analytics(
                1L, 1L, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 2), teacher);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> students = (List<Map<String, Object>>) result.get("students");

        assertEquals(2, students.size());

        // Alice: 1/1 = 100% (Session 2 cancelled is excluded!)
        Map<String, Object> aliceMap = students.stream()
                .filter(s -> s.get("studentId").equals(10L))
                .findFirst().orElseThrow();
        assertEquals(1, aliceMap.get("presentCount"));
        assertEquals(1, aliceMap.get("sessionCount")); // denominator is 1, NOT 2!
        assertEquals(new BigDecimal("100.00"), aliceMap.get("attendancePercentage"));

        // Bob: 0/1 = 0%
        Map<String, Object> bobMap = students.stream()
                .filter(s -> s.get("studentId").equals(20L))
                .findFirst().orElseThrow();
        assertEquals(0, bobMap.get("presentCount"));
        assertEquals(1, bobMap.get("sessionCount"));
        assertEquals(new BigDecimal("0.00"), bobMap.get("attendancePercentage"));
    }

    @Test
    void testApprovedStudentLeaveExcludesSessionFromDenominator() {
        // Conducted session: Bob was ABSENT, but has approved Medical leave on that date
        AttendanceSession session = new AttendanceSession();
        session.setId(1L);
        session.setStatus(AttendanceSession.SessionStatus.FINALIZED);
        session.setStartedAt(LocalDateTime.of(2026, 10, 1, 9, 0));

        AttendanceRecord r1B = new AttendanceRecord();
        r1B.setStudent(student2);
        r1B.setStatus(AttendanceRecord.AttendanceStatus.ABSENT);

        session.setAttendanceRecords(java.util.Set.of(r1B));

        when(sessionRepo.findByClassSectionIdAndSubjectIdAndStatusAndStartedAtBetween(
                eq(1L), eq(1L), eq(AttendanceSession.SessionStatus.FINALIZED), any(), any()))
                .thenReturn(List.of(session));

        StudentLeave leave = new StudentLeave();
        leave.setStatus(StudentLeave.LeaveStatus.APPROVED);
        leave.setLeaveType(StudentLeave.LeaveType.MEDICAL);

        when(studentLeaveRepo.findApprovedLeaveOnDate(eq(20L), eq(LocalDate.of(2026, 10, 1))))
                .thenReturn(List.of(leave));

        Map<String, Object> result = analyticsService.analytics(
                1L, 1L, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 1), teacher);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> students = (List<Map<String, Object>>) result.get("students");

        // Since Bob had approved leave for the only session, he has 0 sessions in denominator
        assertTrue(students.isEmpty() || students.stream().noneMatch(s -> s.get("studentId").equals(20L)));
    }
}
