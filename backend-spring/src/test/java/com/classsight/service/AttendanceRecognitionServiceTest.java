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
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.mock.web.MockMultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doReturn;

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
    void testUndetectedStudentsRequireFacultyConfirmationBeforeFinalization() {
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
            s.setFaceEmbedding(java.util.Collections.nCopies(128, 0.1));
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
        // 1. Recognized attendance is not committed until faculty reviews the expected roster.
        assertEquals(AttendanceSession.SessionStatus.REVIEW_REQUIRED, processed.getStatus(),
                "Faculty review is mandatory before attendance is finalized");

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

        // 4. Missing students remain unresolved until the teacher confirms their absence.
        for (long i = 4; i <= 5; i++) {
            AttendanceRecord rec = recordsByStudentId.get(i);
            assertNotNull(rec, "Record for student " + i + " must exist");
            assertEquals(AttendanceRecord.AttendanceStatus.REVIEW, rec.getStatus());
            assertEquals(AttendanceRecord.ReviewStatus.PENDING, rec.getReviewStatus());
            assertEquals("ABSENT_CANDIDATE", rec.getRecognitionState());
            assertTrue(rec.getQualityWarning().contains("faculty must confirm"));
        }
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void multiShotDeduplicatesTheSameStudentAndKeepsHighestConfidence() {
        ClassSection section = new ClassSection(); section.setId(7L); section.setName("CSE-A");
        List<Student> roster = new ArrayList<>();
        for (long id=1; id<=3; id++) { Student student=new Student();student.setId(id);student.setRollNumber("R"+id);student.setFirstName("Student"+id);student.setLastName("");student.setClassSection(section);student.setActive(true);student.setFaceEmbedding(java.util.Collections.nCopies(128,0.1));roster.add(student); }
        AttendanceSession session=new AttendanceSession();session.setId(90L);session.setClassSection(section);session.setStatus(AttendanceSession.SessionStatus.CAPTURED);
        when(sessionRepository.findById(90L)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(AttendanceSession.class))).thenAnswer(inv->inv.getArgument(0));
        when(studentRepository.findByClassSectionAndActiveTrue(section)).thenReturn(roster);
        Map<String,Object> first=recognitionPayload(List.of(testMatch(1L,.80,.34),testMatch(2L,.76,.36)));
        Map<String,Object> second=recognitionPayload(List.of(testMatch(1L,.96,.22),testMatch(3L,.91,.27)));
        ResponseEntity<Map> firstResponse=ResponseEntity.ok(first), secondResponse=ResponseEntity.ok(second);
        doReturn(firstResponse).doReturn(secondResponse).when(restTemplate).exchange(anyString(),any(HttpMethod.class),any(HttpEntity.class),any(ParameterizedTypeReference.class));
        List<MultipartFile> photos=List.of(new MockMultipartFile("image","one.jpg","image/jpeg",new byte[]{1}),new MockMultipartFile("image","two.jpg","image/jpeg",new byte[]{2}));

        AttendanceSession result=service.processCapturedSession(90L,photos);

        assertEquals(3,result.getAttendanceRecords().size());
        assertEquals(AttendanceSession.SessionStatus.REVIEW_REQUIRED,result.getStatus());
        AttendanceRecord studentOne=result.getAttendanceRecords().stream().filter(r->r.getStudent().getId().equals(1L)).findFirst().orElseThrow();
        assertEquals(.96,studentOne.getConfidenceScore().doubleValue(),.0001);
        assertTrue(result.getRecognitionDiagnostics().contains("shot_index"));
    }

    @Test
    void testParseSecondBestDistanceHandlesNullAsInfinity() {
        assertEquals(Double.POSITIVE_INFINITY, AttendanceRecognitionService.parseSecondBestDistance(null));
        assertEquals(Double.POSITIVE_INFINITY, AttendanceRecognitionService.parseSecondBestDistance("not-a-number"));
        assertEquals(5.25, AttendanceRecognitionService.parseSecondBestDistance(5.25), 0.001);
    }

    @Test
    void testTierMappingAutoVsReview() {
        ClassSection section = new ClassSection();
        section.setId(20L);
        section.setName("TEST-SEC-TIERS");

        List<Student> students = new ArrayList<>();
        Student s1 = new Student();
        s1.setId(101L);
        s1.setRollNumber("S101");
        s1.setActive(true);
        s1.setClassSection(section);
        s1.setFaceEmbedding(java.util.Collections.nCopies(128, 0.1));
        students.add(s1);

        Student s2 = new Student();
        s2.setId(102L);
        s2.setRollNumber("S102");
        s2.setActive(true);
        s2.setClassSection(section);
        s2.setFaceEmbedding(java.util.Collections.nCopies(128, 0.1));
        students.add(s2);

        AttendanceSession session = new AttendanceSession();
        session.setId(200L);
        session.setClassSection(section);
        session.setStatus(AttendanceSession.SessionStatus.CAPTURED);

        when(sessionRepository.findById(200L)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(AttendanceSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(studentRepository.findByClassSectionAndActiveTrue(section)).thenReturn(students);

        // s1 is AUTO tier, s2 is REVIEW tier
        Map<String, Object> match1 = new HashMap<>();
        match1.put("student_id", 101L);
        match1.put("confidence_score", 0.95);
        match1.put("distance", 5.5);
        match1.put("second_best_distance", null); // null parsed as Infinity
        match1.put("margin", null);
        match1.put("tier", "AUTO");
        match1.put("matched", true);
        match1.put("recognition_state", "RECOGNIZED");

        Map<String, Object> match2 = new HashMap<>();
        match2.put("student_id", 102L);
        match2.put("confidence_score", 0.70);
        match2.put("distance", 8.8);
        match2.put("second_best_distance", 9.1);
        match2.put("margin", 0.3);
        match2.put("tier", "REVIEW");
        match2.put("matched", false);
        match2.put("recognition_state", "REVIEW_REQUIRED");

        Map<String, Object> payload = new HashMap<>();
        payload.put("matches", List.of(match1, match2));
        payload.put("quality", Map.of("quality_passed", true, "blur_score", 100.0, "brightness_mean", 100.0, "liveness_score", 0.9, "warnings", List.of()));

        AttendanceSession processed = service.processRecognitionResult(200L, payload);

        AttendanceRecord r1 = processed.getAttendanceRecords().stream().filter(r -> r.getStudent().getId().equals(101L)).findFirst().orElseThrow();
        assertEquals(AttendanceRecord.AttendanceStatus.PRESENT, r1.getStatus());
        assertEquals(AttendanceRecord.ReviewStatus.APPROVED, r1.getReviewStatus());
        assertEquals("RECOGNIZED", r1.getRecognitionState());

        AttendanceRecord r2 = processed.getAttendanceRecords().stream().filter(r -> r.getStudent().getId().equals(102L)).findFirst().orElseThrow();
        assertEquals(AttendanceRecord.AttendanceStatus.REVIEW, r2.getStatus());
        assertEquals(AttendanceRecord.ReviewStatus.PENDING, r2.getReviewStatus());
        assertEquals("ABSENT_CANDIDATE", r2.getRecognitionState());
    }

    private Map<String,Object> recognitionPayload(List<Map<String,Object>> matches) {
        return Map.of("matches",matches,"quality",Map.of("quality_passed",true,"blur_score",120.0,"brightness_mean",110.0,"liveness_score",.9,"warnings",List.of()));
    }
    private Map<String,Object> testMatch(Long id,double confidence,double distance) {
        Map<String,Object> match=new HashMap<>();match.put("student_id",id);match.put("roll_number","R"+id);match.put("confidence_score",confidence);match.put("distance",distance);match.put("matched",true);match.put("face_size_ratio",.05);match.put("recognition_state","RECOGNIZED");match.put("quality_warnings",List.of());return match;
    }
}
