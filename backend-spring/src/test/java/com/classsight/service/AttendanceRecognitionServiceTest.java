package com.classsight.service;

import com.classsight.entity.AttendanceRecord;
import com.classsight.entity.AttendanceSession;
import com.classsight.entity.ClassSection;
import com.classsight.entity.Student;
import com.classsight.repository.AttendanceSessionRepository;
import com.classsight.repository.StudentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class AttendanceRecognitionServiceTest {

    private AttendanceSessionRepository sessionRepository;
    private StudentRepository studentRepository;
    private RestTemplate restTemplate;
    private ObjectMapper objectMapper;
    private AttendanceRecognitionService service;

    @BeforeEach
    void setUp() {
        sessionRepository = Mockito.mock(AttendanceSessionRepository.class);
        studentRepository = Mockito.mock(StudentRepository.class);
        restTemplate = Mockito.mock(RestTemplate.class);
        objectMapper = new ObjectMapper();
        service = new AttendanceRecognitionService(
                sessionRepository,
                studentRepository,
                restTemplate,
                objectMapper,
                "http://localhost:8000",
                0.6,
                false
        );
    }

    @Test
    void testUndetectedStudentsMarkedAbsentAndSessionFinalizesCleanly() {
        // Given: 5 enrolled students in ClassSection
        ClassSection section = new ClassSection();
        section.setId(1L);
        section.setName("CS-2026-A");

        List<Student> enrolledStudents = new ArrayList<>();
        for (long i = 1; i <= 5; i++) {
            Student s = new Student();
            s.setId(i);
            s.setRollNumber("ROLL-" + i);
            s.setFirstName("Student" + i);
            s.setLastName("Test");
            s.setClassSection(section);
            s.setActive(true);
            enrolledStudents.add(s);
        }

        AttendanceSession session = new AttendanceSession();
        session.setId(10L);
        session.setClassSection(section);
        session.setStatus(AttendanceSession.SessionStatus.CAPTURED);

        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(AttendanceSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(studentRepository.findByClassSectionAndActiveTrue(section)).thenReturn(enrolledStudents);

        // Simulate recognition payload: 3 students detected with high confidence (matched = true), 2 absent
        Map<String, Object> quality = new HashMap<>();
        quality.put("quality_passed", true);
        quality.put("blur_score", 120.0);
        quality.put("brightness_mean", 110.0);
        quality.put("liveness_score", 0.85);
        quality.put("warnings", List.of());

        List<Map<String, Object>> matches = new ArrayList<>();
        for (long i = 1; i <= 3; i++) {
            Map<String, Object> match = new HashMap<>();
            match.put("face_index", (int) i);
            match.put("student_id", i);
            match.put("confidence_score", 0.95);
            match.put("distance", 0.35);
            match.put("matched", true);
            match.put("face_size_ratio", 0.05);
            match.put("recognition_state", "RECOGNIZED");
            match.put("quality_warnings", List.of());
            matches.add(match);
        }

        Map<String, Object> recognitionPayload = new HashMap<>();
        recognitionPayload.put("matches", matches);
        recognitionPayload.put("quality", quality);

        // When
        AttendanceSession processed = service.processRecognitionResult(10L, recognitionPayload);

        // Then:
        // 1. Session must auto-finalize without requiring review
        assertEquals(AttendanceSession.SessionStatus.FINALIZED, processed.getStatus(),
                "Session must be FINALIZED when all detected faces match cleanly and remaining students are absent");

        // 2. Exactly 5 records created
        assertEquals(5, processed.getAttendanceRecords().size());

        Map<Long, AttendanceRecord> recordsByStudentId = new HashMap<>();
        for (AttendanceRecord rec : processed.getAttendanceRecords()) {
            recordsByStudentId.put(rec.getStudent().getId(), rec);
        }

        // 3. Students 1..3 must be PRESENT and APPROVED
        for (long i = 1; i <= 3; i++) {
            AttendanceRecord rec = recordsByStudentId.get(i);
            assertNotNull(rec, "Record for student " + i + " must exist");
            assertEquals(AttendanceRecord.AttendanceStatus.PRESENT, rec.getStatus());
            assertEquals(AttendanceRecord.ReviewStatus.APPROVED, rec.getReviewStatus());
            assertEquals("RECOGNIZED", rec.getRecognitionState());
        }

        // 4. Missing students 4 and 5 must be ABSENT and APPROVED (NOT REVIEW/PENDING!)
        for (long i = 4; i <= 5; i++) {
            AttendanceRecord rec = recordsByStudentId.get(i);
            assertNotNull(rec, "Record for student " + i + " must exist");
            assertEquals(AttendanceRecord.AttendanceStatus.ABSENT, rec.getStatus(),
                    "Missing student " + rec.getStudent().getRollNumber() + " must be ABSENT");
            assertEquals(AttendanceRecord.ReviewStatus.APPROVED, rec.getReviewStatus(),
                    "Missing student must be APPROVED, not PENDING review");
            assertEquals("ABSENT", rec.getRecognitionState());
            assertNull(rec.getQualityWarning());
        }
    }
}
