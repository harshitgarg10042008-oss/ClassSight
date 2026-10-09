package com.classsight.service;

import com.classsight.entity.*;
import com.classsight.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.DayOfWeek;
import java.util.*;

/**
 * TimetableService — Phase 2 core service.
 *
 * Responsibilities:
 *  1. Generate class_sessions from active timetable slots for a given date range
 *  2. Nightly scheduler that marks past SCHEDULED sessions as MISSED
 *  3. Process teacher leaves → CANCEL affected sessions
 *  4. Current-period lookup for the auto-select teacher flow
 *  5. Conflict detection for new slot additions
 */
@Service
@Transactional
public class TimetableService {

    private static final Logger log = LoggerFactory.getLogger(TimetableService.class);

    /** Minutes before period start where capture is allowed early */
    private static final int EARLY_CAPTURE_MINUTES = 5;

    private final AcademicTermRepository      termRepo;
    private final TimetableSlotRepository     slotRepo;
    private final ClassSessionRepository      sessionRepo;
    private final HolidayRepository           holidayRepo;
    private final TeacherLeaveRepository      leaveRepo;
    private final UserRepository              userRepo;
    private final SubjectRepository           subjectRepo;
    private final ClassSectionRepository      classSectionRepo;
    private final RoomRepository              roomRepo;

    public TimetableService(AcademicTermRepository termRepo,
                             TimetableSlotRepository slotRepo,
                             ClassSessionRepository sessionRepo,
                             HolidayRepository holidayRepo,
                             TeacherLeaveRepository leaveRepo,
                             UserRepository userRepo) {
        this(termRepo, slotRepo, sessionRepo, holidayRepo, leaveRepo, userRepo, null, null, null);
    }

    public TimetableService(AcademicTermRepository termRepo,
                             TimetableSlotRepository slotRepo,
                             ClassSessionRepository sessionRepo,
                             HolidayRepository holidayRepo,
                             TeacherLeaveRepository leaveRepo,
                             UserRepository userRepo,
                             SubjectRepository subjectRepo,
                             ClassSectionRepository classSectionRepo,
                             RoomRepository roomRepo) {
        this.termRepo         = termRepo;
        this.slotRepo         = slotRepo;
        this.sessionRepo      = sessionRepo;
        this.holidayRepo      = holidayRepo;
        this.leaveRepo        = leaveRepo;
        this.userRepo         = userRepo;
        this.subjectRepo      = subjectRepo;
        this.classSectionRepo = classSectionRepo;
        this.roomRepo         = roomRepo;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Session Generation
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Generates class_sessions for every active slot in the active term
     * between [from, to] (inclusive), skipping holidays and weekends.
     * Idempotent — skips dates that already have a session for the slot.
     *
     * @return number of sessions created
     */
    public int generateSessionsForRange(LocalDate from, LocalDate to) {
        Optional<AcademicTerm> termOpt = termRepo.findByActiveTrue();
        if (termOpt.isEmpty()) {
            log.info("No active academic term; skipping session generation");
            return 0;
        }
        AcademicTerm term = termOpt.get();
        List<TimetableSlot> slots = slotRepo.findByTerm_IdAndActiveTrue(term.getId());
        if (slots.isEmpty()) {
            log.info("No active timetable slots; nothing to generate");
            return 0;
        }

        List<Holiday> holidays = holidayRepo.findHolidaysInRange(from, to, term.getId());
        List<LocalDate> holidayDates = holidays.stream().map(Holiday::getDate).toList();

        int created = 0;
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            if (!isWeekend(cursor) && !holidayDates.contains(cursor)) {
                int dow = cursor.getDayOfWeek().getValue(); // 1=Mon..7=Sun
                for (TimetableSlot slot : slots) {
                    if (slot.getDayOfWeek() == dow) {
                        if (sessionRepo.findBySlot_IdAndDate(slot.getId(), cursor).isEmpty()) {
                            ClassSession cs = new ClassSession();
                            cs.setSlot(slot);
                            cs.setDate(cursor);
                            cs.setStartTime(slot.getStartTime());
                            cs.setEndTime(slot.getEndTime());
                            cs.setSubject(slot.getSubject());
                            cs.setClassSection(slot.getClassSection());
                            cs.setTeacher(slot.getTeacher());
                            cs.setRoom(slot.getRoom());
                            cs.setStatus(ClassSession.SessionStatus.SCHEDULED);
                            cs.setType(ClassSession.SessionType.REGULAR);
                            sessionRepo.save(cs);
                            created++;
                        }
                    }
                }
            }
            cursor = cursor.plusDays(1);
        }
        log.info("Generated {} class sessions for range {} to {}", created, from, to);
        return created;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Nightly Scheduler — mark past SCHEDULED sessions as MISSED
    // ──────────────────────────────────────────────────────────────────────────

    /** Runs at 23:55 every night; marks SCHEDULED sessions that are now in the past as MISSED. */
    @Scheduled(cron = "0 55 23 * * *")
    public void markMissedSessions() {
        LocalDate today = LocalDate.now();
        LocalTime now   = LocalTime.now();
        List<ClassSession> toMiss = sessionRepo.findSessionsToMarkMissed(today, now);
        for (ClassSession cs : toMiss) {
            cs.setStatus(ClassSession.SessionStatus.MISSED);
        }
        if (!toMiss.isEmpty()) {
            sessionRepo.saveAll(toMiss);
            log.info("Marked {} sessions as MISSED", toMiss.size());
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Teacher Leave → Cancel Affected Sessions
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Called when a teacher leave is approved.
     * Cancels all SCHEDULED sessions for the teacher in the leave range.
     *
     * @return list of cancelled class session IDs
     */
    public List<Long> cancelSessionsForLeave(TeacherLeave leave) {
        List<ClassSession> toCancel = new ArrayList<>();
        LocalDate cursor = leave.getFromDate();
        while (!cursor.isAfter(leave.getToDate())) {
            List<ClassSession> daySessions = sessionRepo.findByDateAndTeacher_IdOrderByStartTimeAsc(
                    cursor, leave.getTeacher().getId());
            for (ClassSession cs : daySessions) {
                if (cs.getStatus() == ClassSession.SessionStatus.SCHEDULED) {
                    cs.setStatus(ClassSession.SessionStatus.CANCELLED);
                    cs.setReason("Teacher on approved leave: " + leave.getReason());
                    toCancel.add(cs);
                }
            }
            cursor = cursor.plusDays(1);
        }
        if (!toCancel.isEmpty()) {
            sessionRepo.saveAll(toCancel);
        }
        return toCancel.stream().map(ClassSession::getId).toList();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Current / Next Period Lookup (for teacher auto-select)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Returns the class session the teacher should be teaching right now,
     * or the next upcoming one if none is currently active.
     * Returns Optional.empty() if no timetable data exists.
     */
    @Transactional(readOnly = true)
    public Optional<ClassSession> getCurrentOrNextPeriod(Long teacherId) {
        LocalDate today = LocalDate.now();
        LocalTime now   = LocalTime.now();

        // current period (teacher is inside a scheduled window)
        Optional<ClassSession> current = sessionRepo.findCurrentPeriodForTeacher(today, teacherId, now);
        if (current.isPresent()) {
            return current;
        }

        // next period today
        List<ClassSession> upcoming = sessionRepo.findUpcomingPeriodsForTeacher(today, teacherId, now);
        return upcoming.isEmpty() ? Optional.empty() : Optional.of(upcoming.get(0));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Capture Window Guard
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Returns true if a capture is allowed for the given class session right now
     * (i.e. within [startTime - EARLY_CAPTURE_MINUTES, endTime + graceMinutes]).
     */
    @Transactional(readOnly = true)
    public boolean isCaptureAllowed(ClassSession session, int graceMinutes) {
        LocalTime now   = LocalTime.now();
        LocalTime open  = session.getStartTime().minusMinutes(EARLY_CAPTURE_MINUTES);
        LocalTime close = session.getEndTime().plusMinutes(graceMinutes);
        return !now.isBefore(open) && !now.isAfter(close);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. Mark Session as CONDUCTED
    // ──────────────────────────────────────────────────────────────────────────

    public ClassSession markConducted(ClassSession session) {
        if (session.getStatus() == ClassSession.SessionStatus.SCHEDULED
                || session.getStatus() == ClassSession.SessionStatus.SUBSTITUTED) {
            session.setStatus(ClassSession.SessionStatus.CONDUCTED);
            return sessionRepo.save(session);
        }
        return session;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. Assign Substitute Teacher
    // ──────────────────────────────────────────────────────────────────────────

    public ClassSession assignSubstitute(Long sessionId, Long substituteTeacherId, String reason) {
        ClassSession cs = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Class session not found: " + sessionId));
        User sub = userRepo.findById(substituteTeacherId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + substituteTeacherId));
        cs.setSubstituteTeacher(sub);
        cs.setStatus(ClassSession.SessionStatus.SUBSTITUTED);
        cs.setReason(reason);
        return sessionRepo.save(cs);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. Today's Dashboard Summary
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ClassSession> getTodaySessions() {
        return sessionRepo.findByDateOrderByStartTimeAsc(LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<ClassSession> getSessionsForDateRange(LocalDate from, LocalDate to) {
        return sessionRepo.findByDateBetweenOrderByDateAscStartTimeAsc(from, to);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. Conflict Detection
    // ──────────────────────────────────────────────────────────────────────────

    public static class ConflictResult {
        private final boolean hasConflict;
        private final String conflictType;
        private final String description;

        public ConflictResult(boolean hasConflict, String conflictType, String description) {
            this.hasConflict = hasConflict;
            this.conflictType = conflictType;
            this.description = description;
        }

        public boolean hasConflict() { return hasConflict; }
        public String getConflictType() { return conflictType; }
        public String getDescription() { return description; }
    }

    public ConflictResult checkConflict(TimetableSlot candidate, List<TimetableSlot> existingSlots) {
        for (TimetableSlot existing : existingSlots) {
            if (candidate.getId() != null && candidate.getId().equals(existing.getId())) continue;
            if (candidate.getDayOfWeek() != existing.getDayOfWeek()) continue;
            boolean overlaps = candidate.getStartTime().isBefore(existing.getEndTime())
                    && existing.getStartTime().isBefore(candidate.getEndTime());
            if (!overlaps) continue;

            if (candidate.getTeacher() != null && existing.getTeacher() != null
                    && candidate.getTeacher().getId().equals(existing.getTeacher().getId())) {
                return new ConflictResult(true, "TEACHER_DOUBLE_BOOKED",
                        String.format("Teacher '%s' is double-booked on %s %s-%s",
                                candidate.getTeacher().getUsername(),
                                DayOfWeek.of(candidate.getDayOfWeek()),
                                existing.getStartTime(), existing.getEndTime()));
            }
            if (candidate.getRoom() != null && existing.getRoom() != null
                    && candidate.getRoom().getId().equals(existing.getRoom().getId())) {
                return new ConflictResult(true, "ROOM_DOUBLE_BOOKED",
                        String.format("Room '%s' is double-booked on %s %s-%s",
                                candidate.getRoom().getName(),
                                DayOfWeek.of(candidate.getDayOfWeek()),
                                existing.getStartTime(), existing.getEndTime()));
            }
            if (candidate.getClassSection() != null && existing.getClassSection() != null
                    && candidate.getClassSection().getId().equals(existing.getClassSection().getId())) {
                return new ConflictResult(true, "SECTION_DOUBLE_BOOKED",
                        String.format("Section '%s' is double-booked on %s %s-%s",
                                candidate.getClassSection().getName(),
                                DayOfWeek.of(candidate.getDayOfWeek()),
                                existing.getStartTime(), existing.getEndTime()));
            }
        }
        return new ConflictResult(false, null, null);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10. CSV Validation and Import
    // ──────────────────────────────────────────────────────────────────────────

    public Map<String, Object> validateAndImportTimetableCsv(String csvContent, boolean commit) {
        Optional<AcademicTerm> termOpt = termRepo.findByActiveTrue();
        if (termOpt.isEmpty()) {
            return Map.of("success", false, "error", "No active academic term found. Please activate an academic term first.");
        }
        AcademicTerm term = termOpt.get();

        List<TimetableSlot> existingSlots = new ArrayList<>(slotRepo.findByTerm_IdAndActiveTrue(term.getId()));
        List<Map<String, Object>> errorTable = new ArrayList<>();
        List<TimetableSlot> validSlotsToSave = new ArrayList<>();

        String[] lines = csvContent.split("\\r?\\n");
        int rowIdx = 0;
        boolean headerProcessed = false;

        for (String rawLine : lines) {
            rowIdx++;
            String line = rawLine.trim();
            if (line.isEmpty() || line.startsWith("#")) continue;

            String[] cols = line.split(",");
            if (!headerProcessed) {
                headerProcessed = true;
                if (cols[0].trim().equalsIgnoreCase("day") || cols[0].trim().equalsIgnoreCase("day_of_week")) {
                    continue;
                }
            }

            if (cols.length < 7) {
                errorTable.add(Map.of("row", rowIdx, "field", "columns", "message",
                        "Expected 7 columns (day,start_time,end_time,subject_code,section,teacher_username,room), found " + cols.length));
                continue;
            }

            String dayStr = cols[0].trim();
            String startStr = cols[1].trim();
            String endStr = cols[2].trim();
            String subjectCode = cols[3].trim();
            String sectionName = cols[4].trim();
            String teacherUsername = cols[5].trim();
            String roomName = cols[6].trim();

            int dayOfWeek;
            try {
                dayOfWeek = parseDayOfWeek(dayStr);
            } catch (Exception e) {
                errorTable.add(Map.of("row", rowIdx, "field", "day", "message", "Invalid day: " + dayStr));
                continue;
            }

            LocalTime startTime;
            LocalTime endTime;
            try {
                startTime = LocalTime.parse(startStr);
                endTime = LocalTime.parse(endStr);
            } catch (Exception e) {
                errorTable.add(Map.of("row", rowIdx, "field", "time", "message", "Invalid time format (expected HH:mm): " + startStr + "-" + endStr));
                continue;
            }

            if (!startTime.isBefore(endTime)) {
                errorTable.add(Map.of("row", rowIdx, "field", "time", "message", "start_time must be before end_time (" + startStr + " >= " + endStr + ")"));
                continue;
            }

            Subject subject = (subjectRepo != null ? subjectRepo.findByCode(subjectCode) : Optional.<Subject>empty()).orElse(null);
            if (subject == null) {
                errorTable.add(Map.of("row", rowIdx, "field", "subject_code", "message", "Unknown subject code: " + subjectCode));
                continue;
            }

            ClassSection section = (classSectionRepo != null ? classSectionRepo.findByName(sectionName) : Optional.<ClassSection>empty()).orElse(null);
            if (section == null) {
                errorTable.add(Map.of("row", rowIdx, "field", "section", "message", "Unknown class section: " + sectionName));
                continue;
            }

            User teacher = userRepo.findByUsername(teacherUsername).orElse(null);
            if (teacher == null) {
                errorTable.add(Map.of("row", rowIdx, "field", "teacher_username", "message", "Unknown teacher: " + teacherUsername));
                continue;
            }

            Room room = (roomRepo != null ? roomRepo.findByName(roomName) : Optional.<Room>empty()).orElse(null);
            if (room == null) {
                errorTable.add(Map.of("row", rowIdx, "field", "room", "message", "Unknown room: " + roomName));
                continue;
            }

            TimetableSlot candidate = new TimetableSlot();
            candidate.setTerm(term);
            candidate.setDayOfWeek(dayOfWeek);
            candidate.setStartTime(startTime);
            candidate.setEndTime(endTime);
            candidate.setSubject(subject);
            candidate.setClassSection(section);
            candidate.setTeacher(teacher);
            candidate.setRoom(room);
            candidate.setActive(true);

            // Conflict check
            ConflictResult conflict = checkConflict(candidate, existingSlots);
            if (conflict.hasConflict()) {
                errorTable.add(Map.of("row", rowIdx, "field", conflict.getConflictType(), "message", conflict.getDescription()));
                continue;
            }

            existingSlots.add(candidate);
            validSlotsToSave.add(candidate);
        }

        int imported = 0;
        if (commit && errorTable.isEmpty() && !validSlotsToSave.isEmpty()) {
            slotRepo.saveAll(validSlotsToSave);
            imported = validSlotsToSave.size();
            LocalDate today = LocalDate.now();
            generateSessionsForRange(today, today.plusDays(7));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", errorTable.isEmpty());
        result.put("totalRows", validSlotsToSave.size() + errorTable.size());
        result.put("validRows", validSlotsToSave.size());
        result.put("errorRows", errorTable.size());
        result.put("imported", imported);
        result.put("errors", errorTable);
        return result;
    }

    private int parseDayOfWeek(String s) {
        String upper = s.toUpperCase().trim();
        return switch (upper) {
            case "MONDAY", "MON", "1" -> 1;
            case "TUESDAY", "TUE", "2" -> 2;
            case "WEDNESDAY", "WED", "3" -> 3;
            case "THURSDAY", "THU", "4" -> 4;
            case "FRIDAY", "FRI", "5" -> 5;
            case "SATURDAY", "SAT", "6" -> 6;
            case "SUNDAY", "SUN", "7" -> 7;
            default -> throw new IllegalArgumentException("Unknown day: " + s);
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private boolean isWeekend(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
    }
}
