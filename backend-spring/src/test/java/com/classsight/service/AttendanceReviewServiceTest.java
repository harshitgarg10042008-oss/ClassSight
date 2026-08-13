package com.classsight.service;

import com.classsight.entity.AttendanceRecord;
import com.classsight.entity.AttendanceSession;
import com.classsight.entity.Student;
import com.classsight.entity.User;
import com.classsight.repository.AttendanceSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class AttendanceReviewServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void storesCaptureOnDiskAndReturnsReference() throws Exception {
        CapturePhotoStorageService storage = new CapturePhotoStorageService(tempDir.toString());
        byte[] bytes = "fake-jpeg-bytes".getBytes();
        String path = storage.store(44L, new MockMultipartFile("image", "capture.jpg", "image/jpeg", bytes));

        assertTrue(Files.isRegularFile(Path.of(path)));
        assertArrayEquals(bytes, Files.readAllBytes(Path.of(path)));
        System.out.println("ACTUAL_CAPTURE_PERSISTENCE_PATH=" + path + " BYTES=" + Files.size(Path.of(path)));
    }

    @Test
    void ownerSubmitsDecisionsAndSessionFinalizes() {
        AttendanceSessionRepository repository = Mockito.mock(AttendanceSessionRepository.class);
        AttendanceReviewService service = new AttendanceReviewService(repository);
        User owner = user(1L, "owner", User.Role.TEACHER);
        Student student = student(7L, "S-7");
        AttendanceSession session = new AttendanceSession();
        session.setId(44L);
        session.setFaculty(owner);
        session.setStatus(AttendanceSession.SessionStatus.REVIEW_REQUIRED);
        AttendanceRecord record = new AttendanceRecord();
        record.setId(100L);
        record.setSession(session);
        record.setStudent(student);
        record.setStatus(AttendanceRecord.AttendanceStatus.REVIEW);
        session.getAttendanceRecords().add(record);
        Mockito.when(repository.findById(44L)).thenReturn(Optional.of(session));
        Mockito.when(repository.save(session)).thenReturn(session);

        AttendanceSession result = service.submitReview(44L, owner,
                List.of(Map.of("studentId", 7L, "decision", "PRESENT")));

        assertEquals(AttendanceSession.SessionStatus.FINALIZED, result.getStatus());
        assertEquals(AttendanceRecord.AttendanceStatus.PRESENT, record.getStatus());
        assertEquals(AttendanceRecord.ReviewStatus.APPROVED, record.getReviewStatus());
        assertEquals(1L, record.getReviewedBy());
        System.out.println("ACTUAL_REVIEW_SUBMIT_STATUS=" + result.getStatus() + " RECORD_STATUS=" + record.getStatus() + " REVIEW_STATUS=" + record.getReviewStatus());
    }

    @Test
    void differentTeacherIsDenied() {
        AttendanceSessionRepository repository = Mockito.mock(AttendanceSessionRepository.class);
        AttendanceReviewService service = new AttendanceReviewService(repository);
        User owner = user(1L, "owner", User.Role.TEACHER);
        User other = user(2L, "other", User.Role.TEACHER);
        AttendanceSession session = new AttendanceSession();
        session.setId(44L);
        session.setFaculty(owner);
        Mockito.when(repository.findById(44L)).thenReturn(Optional.of(session));

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.getReview(44L, other));
    }

    private User user(Long id, String username, User.Role role) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setRole(role);
        return user;
    }

    private Student student(Long id, String rollNumber) {
        Student student = new Student();
        student.setId(id);
        student.setRollNumber(rollNumber);
        student.setFirstName("Test");
        student.setLastName("Student");
        return student;
    }
}
