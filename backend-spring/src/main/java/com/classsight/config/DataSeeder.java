package com.classsight.config;

import com.classsight.entity.Camera;
import com.classsight.entity.ClassSection;
import com.classsight.entity.FacultySubjectAssignment;
import com.classsight.entity.Room;
import com.classsight.entity.Subject;
import com.classsight.entity.User;
import com.classsight.repository.CameraRepository;
import com.classsight.repository.ClassSectionRepository;
import com.classsight.repository.FacultySubjectAssignmentRepository;
import com.classsight.repository.RoomRepository;
import com.classsight.repository.SubjectRepository;
import com.classsight.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ClassSectionRepository classSectionRepository;

    @Autowired
    private FacultySubjectAssignmentRepository assignmentRepository;

    @Autowired
    private CameraRepository cameraRepository;

    @Override
    @Transactional
    public void run(String... args) {
        User admin = seedAdminUser();
        User teacher = seedTeacherUser();
        Room defaultRoom = seedRoom();
        Subject defaultSubject = seedSubject();
        ClassSection defaultSection = seedClassSection();
        seedCamera(defaultRoom);
        seedAssignment(teacher, defaultSubject, defaultSection);
    }

    private User seedAdminUser() {
        return userRepository.findByUsername("admin").orElseGet(() -> {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setFullName("Admin User");
            admin.setEmail("admin@classsight.com");
            admin.setRole(User.Role.ADMIN);
            admin.setEnabled(true);
            User saved = userRepository.save(admin);
            logger.info("✓ Admin user created: username=admin, password=admin123");
            return saved;
        });
    }

    private User seedTeacherUser() {
        return userRepository.findByUsername("teacher").orElseGet(() -> {
            User teacher = new User();
            teacher.setUsername("teacher");
            teacher.setPassword(passwordEncoder.encode("teacher123"));
            teacher.setFullName("Teacher User");
            teacher.setEmail("teacher@classsight.com");
            teacher.setRole(User.Role.TEACHER);
            teacher.setEnabled(true);
            User saved = userRepository.save(teacher);
            logger.info("✓ Teacher user created: username=teacher, password=teacher123");
            return saved;
        });
    }

    private Room seedRoom() {
        if (roomRepository.count() == 0) {
            Room r = new Room();
            r.setName("Room 101 - CS Lab");
            r.setBuilding("Main Academic Block");
            r.setFloor(1);
            r.setCapacity(40);
            r.setActive(true);
            Room saved = roomRepository.save(r);
            logger.info("✓ Seeded default room: {}", saved.getName());
            return saved;
        }
        return roomRepository.findAll().get(0);
    }

    private Subject seedSubject() {
        if (subjectRepository.count() == 0) {
            Subject s = new Subject();
            s.setCode("CS101");
            s.setName("Computer Science - Biometrics");
            s.setDescription("Computer Vision and Biometric Attendance");
            s.setActive(true);
            Subject saved = subjectRepository.save(s);
            logger.info("✓ Seeded default subject: {} - {}", saved.getCode(), saved.getName());
            return saved;
        }
        return subjectRepository.findAll().get(0);
    }

    private ClassSection seedClassSection() {
        if (classSectionRepository.count() == 0) {
            ClassSection sec = new ClassSection();
            sec.setName("CS-2026-A");
            sec.setDescription("Computer Science Department - Batch 2026 Section A");
            sec.setAcademicYear(2026);
            sec.setActive(true);
            ClassSection saved = classSectionRepository.save(sec);
            logger.info("✓ Seeded default class section: {}", saved.getName());
            return saved;
        }
        return classSectionRepository.findAll().get(0);
    }

    private void seedCamera(Room defaultRoom) {
        if (cameraRepository.count() == 0 && defaultRoom != null) {
            Camera c = new Camera();
            c.setName("Browser Webcam (Room 101)");
            c.setRoom(defaultRoom);
            c.setStatus(Camera.CameraStatus.ONLINE);
            c.setStreamUrl("browser://webcam");
            cameraRepository.save(c);
            logger.info("✓ Seeded default camera: Browser Webcam for room {}", defaultRoom.getName());
        }
    }

    private void seedAssignment(User teacher, Subject subject, ClassSection section) {
        if (assignmentRepository.count() == 0 && teacher != null && subject != null && section != null) {
            FacultySubjectAssignment assignment = new FacultySubjectAssignment();
            assignment.setFaculty(teacher);
            assignment.setSubject(subject);
            assignment.setClassSection(section);
            assignment.setActive(true);
            assignmentRepository.save(assignment);
            logger.info("✓ Seeded faculty assignment: {} -> {} ({})", 
                    teacher.getUsername(), subject.getCode(), section.getName());
        }
    }
}

