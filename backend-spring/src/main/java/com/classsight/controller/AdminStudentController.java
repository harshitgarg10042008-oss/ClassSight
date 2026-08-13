package com.classsight.controller;

import com.classsight.dto.StudentCreateRequest;
import com.classsight.entity.ClassSection;
import com.classsight.entity.Student;
import com.classsight.repository.ClassSectionRepository;
import com.classsight.repository.StudentRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/students")
public class AdminStudentController {
    private final StudentRepository studentRepository;
    private final ClassSectionRepository classSectionRepository;

    public AdminStudentController(StudentRepository studentRepository, ClassSectionRepository classSectionRepository) {
        this.studentRepository = studentRepository;
        this.classSectionRepository = classSectionRepository;
    }

    @GetMapping
    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createStudent(@Valid @RequestBody StudentCreateRequest request) {
        if (studentRepository.existsByRollNumber(request.getRollNumber())) {
            return ResponseEntity.badRequest().body("A student with this roll number already exists");
        }
        ClassSection section = classSectionRepository.findById(request.getClassSectionId()).orElse(null);
        if (section == null) {
            return ResponseEntity.badRequest().body("ClassSection not found");
        }
        Student student = new Student();
        student.setRollNumber(request.getRollNumber());
        student.setFirstName(request.getFirstName());
        student.setLastName(request.getLastName());
        student.setClassSection(section);
        if (request.getActive() != null) {
            student.setActive(request.getActive());
        }
        return ResponseEntity.ok(studentRepository.save(student));
    }
}
