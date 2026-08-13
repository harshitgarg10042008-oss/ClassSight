package com.classsight.service;

import com.classsight.entity.AttendanceRecord;
import com.classsight.entity.AttendanceSession;
import com.classsight.entity.Student;
import com.classsight.entity.User;
import com.classsight.repository.AttendanceSessionRepository;
import com.classsight.repository.FacultySubjectAssignmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AttendanceAnalyticsService {

    private final AttendanceSessionRepository sessionRepository;
    private final FacultySubjectAssignmentRepository assignmentRepository;
    private final double defaulterThreshold;

    public AttendanceAnalyticsService(
            AttendanceSessionRepository sessionRepository,
            FacultySubjectAssignmentRepository assignmentRepository,
            @Value("${attendance.analytics.defaulter-threshold:75}") double defaulterThreshold) {
        this.sessionRepository = sessionRepository;
        this.assignmentRepository = assignmentRepository;
        this.defaulterThreshold = defaulterThreshold;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> analytics(Long subjectId, Long classSectionId, LocalDate from, LocalDate to, User actor) {
        authorize(subjectId, classSectionId, actor);
        LocalDate effectiveFrom = from == null ? LocalDate.of(1970, 1, 1) : from;
        LocalDate effectiveTo = to == null ? LocalDate.now() : to;
        if (effectiveTo.isBefore(effectiveFrom)) {
            throw new IllegalArgumentException("to must be on or after from");
        }

        List<AttendanceSession> sessions = sessionRepository.findByClassSectionIdAndSubjectIdAndStatusAndStartedAtBetween(
                classSectionId, subjectId, AttendanceSession.SessionStatus.FINALIZED,
                effectiveFrom.atStartOfDay(), effectiveTo.atTime(LocalTime.MAX));

        Map<Long, StudentSummary> summaries = new HashMap<>();
        for (AttendanceSession session : sessions) {
            for (AttendanceRecord record : session.getAttendanceRecords()) {
                if (record.getStatus() != AttendanceRecord.AttendanceStatus.PRESENT
                        && record.getStatus() != AttendanceRecord.AttendanceStatus.ABSENT) {
                    continue;
                }
                Student student = record.getStudent();
                StudentSummary summary = summaries.computeIfAbsent(student.getId(), id -> new StudentSummary(student));
                summary.total++;
                if (record.getStatus() == AttendanceRecord.AttendanceStatus.PRESENT) summary.present++;
            }
        }

        List<Map<String, Object>> students = summaries.values().stream()
                .sorted(Comparator.comparing(item -> item.student.getRollNumber()))
                .map(StudentSummary::toMap)
                .toList();
        List<Map<String, Object>> defaulters = students.stream()
                .filter(item -> ((BigDecimal) item.get("attendancePercentage")).doubleValue() < defaulterThreshold)
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("subjectId", subjectId);
        response.put("classSectionId", classSectionId);
        response.put("from", effectiveFrom.toString());
        response.put("to", effectiveTo.toString());
        response.put("finalizedSessionCount", sessions.size());
        response.put("defaulterThreshold", defaulterThreshold);
        response.put("students", students);
        response.put("defaulters", defaulters);
        return response;
    }

    public double getDefaulterThreshold() {
        return defaulterThreshold;
    }

    private void authorize(Long subjectId, Long classSectionId, User actor) {
        boolean admin = actor != null && actor.getRole() == User.Role.ADMIN;
        boolean assigned = actor != null && assignmentRepository
                .existsByFacultyIdAndSubjectIdAndClassSectionIdAndActiveTrue(actor.getId(), subjectId, classSectionId);
        if (!admin && !assigned) {
            throw new AccessDeniedException("You are not assigned to this subject and class section");
        }
    }

    private static final class StudentSummary {
        private final Student student;
        private int present;
        private int total;

        private StudentSummary(Student student) {
            this.student = student;
        }

        private Map<String, Object> toMap() {
            BigDecimal percentage = total == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(present * 100.0 / total).setScale(2, RoundingMode.HALF_UP);
            Map<String, Object> result = new HashMap<>();
            result.put("studentId", student.getId());
            result.put("rollNumber", student.getRollNumber());
            result.put("studentName", student.getFirstName() + " " + student.getLastName());
            result.put("presentCount", present);
            result.put("sessionCount", total);
            result.put("attendancePercentage", percentage);
            return result;
        }
    }
}
