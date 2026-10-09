package com.classsight.service;

import com.classsight.entity.*;
import com.classsight.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TimetableServiceTest {

    private AcademicTermRepository termRepo;
    private TimetableSlotRepository slotRepo;
    private ClassSessionRepository sessionRepo;
    private HolidayRepository holidayRepo;
    private TeacherLeaveRepository leaveRepo;
    private UserRepository userRepo;
    private TimetableService timetableService;

    @BeforeEach
    void setUp() {
        termRepo = mock(AcademicTermRepository.class);
        slotRepo = mock(TimetableSlotRepository.class);
        sessionRepo = mock(ClassSessionRepository.class);
        holidayRepo = mock(HolidayRepository.class);
        leaveRepo = mock(TeacherLeaveRepository.class);
        userRepo = mock(UserRepository.class);

        timetableService = new TimetableService(
                termRepo, slotRepo, sessionRepo, holidayRepo, leaveRepo, userRepo);
    }

    @Test
    void testIsCaptureAllowedInsideWindow() {
        ClassSession session = new ClassSession();
        // Session: current time minus 10 minutes to current time plus 30 minutes
        LocalTime now = LocalTime.now();
        session.setStartTime(now.minusMinutes(10));
        session.setEndTime(now.plusMinutes(30));

        boolean allowed = timetableService.isCaptureAllowed(session, 15);
        assertTrue(allowed, "Capture should be allowed during session time window");
    }

    @Test
    void testIsCaptureAllowedEarlyWithin5Minutes() {
        ClassSession session = new ClassSession();
        LocalTime now = LocalTime.now();
        // Starts 3 minutes in future (inside 5 min early window)
        session.setStartTime(now.plusMinutes(3));
        session.setEndTime(now.plusMinutes(53));

        boolean allowed = timetableService.isCaptureAllowed(session, 15);
        assertTrue(allowed, "Capture should be allowed 3 minutes before start (within 5-min early window)");
    }

    @Test
    void testIsCaptureAllowedLateWithinGraceMinutes() {
        ClassSession session = new ClassSession();
        LocalTime now = LocalTime.now();
        // Ended 10 minutes ago, grace period is 15 minutes
        session.setStartTime(now.minusMinutes(60));
        session.setEndTime(now.minusMinutes(10));

        boolean allowed = timetableService.isCaptureAllowed(session, 15);
        assertTrue(allowed, "Capture should be allowed 10 minutes after end (within 15-min grace window)");
    }

    @Test
    void testMarkConductedChangesStatus() {
        ClassSession session = new ClassSession();
        session.setId(10L);
        session.setStatus(ClassSession.SessionStatus.SCHEDULED);

        when(sessionRepo.save(any(ClassSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ClassSession result = timetableService.markConducted(session);
        assertEquals(ClassSession.SessionStatus.CONDUCTED, result.getStatus());
        verify(sessionRepo, times(1)).save(session);
    }

    @Test
    void testCancelSessionsForLeave() {
        User teacher = new User();
        teacher.setId(2L);
        teacher.setUsername("teacher2");

        TeacherLeave leave = new TeacherLeave();
        leave.setId(1L);
        leave.setTeacher(teacher);
        leave.setFromDate(LocalDate.of(2026, 10, 5));
        leave.setToDate(LocalDate.of(2026, 10, 5));
        leave.setReason("Medical");

        ClassSession cs1 = new ClassSession();
        cs1.setId(101L);
        cs1.setTeacher(teacher);
        cs1.setDate(LocalDate.of(2026, 10, 5));
        cs1.setStatus(ClassSession.SessionStatus.SCHEDULED);

        when(sessionRepo.findByDateAndTeacher_IdOrderByStartTimeAsc(
                eq(leave.getFromDate()), eq(2L)))
                .thenReturn(List.of(cs1));
        when(sessionRepo.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<Long> cancelled = timetableService.cancelSessionsForLeave(leave);

        assertEquals(1, cancelled.size());
        assertEquals(101L, cancelled.get(0));
        assertEquals(ClassSession.SessionStatus.CANCELLED, cs1.getStatus());
        assertTrue(cs1.getReason().contains("Teacher on approved leave"));
    }

    @Test
    void testAssignSubstitute() {
        ClassSession cs = new ClassSession();
        cs.setId(50L);
        cs.setStatus(ClassSession.SessionStatus.SCHEDULED);

        User subTeacher = new User();
        subTeacher.setId(3L);
        subTeacher.setUsername("sub_teacher");

        when(sessionRepo.findById(50L)).thenReturn(Optional.of(cs));
        when(userRepo.findById(3L)).thenReturn(Optional.of(subTeacher));
        when(sessionRepo.save(any(ClassSession.class))).thenAnswer(inv -> inv.getArgument(0));

        ClassSession updated = timetableService.assignSubstitute(50L, 3L, "Covering for Alice");

        assertEquals(ClassSession.SessionStatus.SUBSTITUTED, updated.getStatus());
        assertEquals(subTeacher, updated.getSubstituteTeacher());
        assertEquals("Covering for Alice", updated.getReason());
    }

    @Test
    void testConflictDetection_TeacherDoubleBooked() {
        User teacher = new User();
        teacher.setId(10L);
        Room room1 = new Room();
        room1.setId(1L);
        Room room2 = new Room();
        room2.setId(2L);
        ClassSection sec1 = new ClassSection();
        sec1.setId(100L);
        ClassSection sec2 = new ClassSection();
        sec2.setId(200L);

        TimetableSlot slotA = new TimetableSlot();
        slotA.setDayOfWeek(1); // Monday
        slotA.setStartTime(LocalTime.of(9, 0));
        slotA.setEndTime(LocalTime.of(10, 0));
        slotA.setTeacher(teacher);
        slotA.setRoom(room1);
        slotA.setClassSection(sec1);

        TimetableSlot slotB = new TimetableSlot();
        slotB.setDayOfWeek(1);
        slotB.setStartTime(LocalTime.of(9, 30)); // Overlaps
        slotB.setEndTime(LocalTime.of(10, 30));
        slotB.setTeacher(teacher);
        slotB.setRoom(room2);
        slotB.setClassSection(sec2);

        TimetableService.ConflictResult result = timetableService.checkConflict(slotB, List.of(slotA));
        assertTrue(result.hasConflict());
        assertEquals("TEACHER_DOUBLE_BOOKED", result.getConflictType());
    }

    @Test
    void testConflictDetection_RoomDoubleBooked() {
        User teacher1 = new User();
        teacher1.setId(10L);
        User teacher2 = new User();
        teacher2.setId(20L);
        Room room = new Room();
        room.setId(1L);
        ClassSection sec1 = new ClassSection();
        sec1.setId(100L);
        ClassSection sec2 = new ClassSection();
        sec2.setId(200L);

        TimetableSlot slotA = new TimetableSlot();
        slotA.setDayOfWeek(2); // Tuesday
        slotA.setStartTime(LocalTime.of(10, 0));
        slotA.setEndTime(LocalTime.of(11, 0));
        slotA.setTeacher(teacher1);
        slotA.setRoom(room);
        slotA.setClassSection(sec1);

        TimetableSlot slotB = new TimetableSlot();
        slotB.setDayOfWeek(2);
        slotB.setStartTime(LocalTime.of(10, 0));
        slotB.setEndTime(LocalTime.of(11, 0));
        slotB.setTeacher(teacher2);
        slotB.setRoom(room);
        slotB.setClassSection(sec2);

        TimetableService.ConflictResult result = timetableService.checkConflict(slotB, List.of(slotA));
        assertTrue(result.hasConflict());
        assertEquals("ROOM_DOUBLE_BOOKED", result.getConflictType());
    }

    @Test
    void testConflictDetection_SectionDoubleBooked() {
        User teacher1 = new User();
        teacher1.setId(10L);
        User teacher2 = new User();
        teacher2.setId(20L);
        Room room1 = new Room();
        room1.setId(1L);
        Room room2 = new Room();
        room2.setId(2L);
        ClassSection sec = new ClassSection();
        sec.setId(100L);

        TimetableSlot slotA = new TimetableSlot();
        slotA.setDayOfWeek(3);
        slotA.setStartTime(LocalTime.of(14, 0));
        slotA.setEndTime(LocalTime.of(15, 0));
        slotA.setTeacher(teacher1);
        slotA.setRoom(room1);
        slotA.setClassSection(sec);

        TimetableSlot slotB = new TimetableSlot();
        slotB.setDayOfWeek(3);
        slotB.setStartTime(LocalTime.of(14, 15));
        slotB.setEndTime(LocalTime.of(15, 15));
        slotB.setTeacher(teacher2);
        slotB.setRoom(room2);
        slotB.setClassSection(sec);

        TimetableService.ConflictResult result = timetableService.checkConflict(slotB, List.of(slotA));
        assertTrue(result.hasConflict());
        assertEquals("SECTION_DOUBLE_BOOKED", result.getConflictType());
    }

    @Test
    void testGenerateSessionsForRange_SkipsHolidays() {
        AcademicTerm term = new AcademicTerm();
        term.setId(1L);
        term.setName("Fall 2026");

        // Monday slot
        TimetableSlot slot = new TimetableSlot();
        slot.setId(10L);
        slot.setTerm(term);
        slot.setDayOfWeek(1); // Monday
        slot.setStartTime(LocalTime.of(9, 0));
        slot.setEndTime(LocalTime.of(10, 0));

        // Monday date
        LocalDate monday = LocalDate.of(2026, 10, 5); // 2026-10-05 is a Monday
        Holiday holiday = new Holiday();
        holiday.setId(1L);
        holiday.setDate(monday);
        holiday.setName("Gandhi Jayanti Observed");

        when(termRepo.findByActiveTrue()).thenReturn(Optional.of(term));
        when(slotRepo.findByTerm_IdAndActiveTrue(1L)).thenReturn(List.of(slot));
        when(holidayRepo.findHolidaysInRange(monday, monday, 1L)).thenReturn(List.of(holiday));

        int created = timetableService.generateSessionsForRange(monday, monday);
        assertEquals(0, created, "Session should not be generated on a holiday");
        verify(sessionRepo, never()).save(any(ClassSession.class));
    }
}
