package com.classsight.controller;

import com.classsight.dto.AssignmentRequest;
import com.classsight.entity.ClassSection;
import com.classsight.entity.FacultySubjectAssignment;
import com.classsight.entity.Subject;
import com.classsight.entity.User;
import com.classsight.repository.ClassSectionRepository;
import com.classsight.repository.FacultySubjectAssignmentRepository;
import com.classsight.repository.SubjectRepository;
import com.classsight.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/admin/assignments")
public class AdminAssignmentController {

    @Autowired
    private FacultySubjectAssignmentRepository assignmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ClassSectionRepository classSectionRepository;

    @GetMapping
    public List<FacultySubjectAssignment> getAllAssignments() {
        return assignmentRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createAssignment(@Valid @RequestBody AssignmentRequest request) {
        Long facultyId = Objects.requireNonNull(request.getFacultyId(), "facultyId is required");
        Long subjectId = Objects.requireNonNull(request.getSubjectId(), "subjectId is required");
        Long classSectionId = Objects.requireNonNull(request.getClassSectionId(), "classSectionId is required");

        Optional<User> facultyOpt = userRepository.findById(facultyId);
        if (facultyOpt.isEmpty()) return ResponseEntity.badRequest().body("Faculty not found");
        
        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
        if (subjectOpt.isEmpty()) return ResponseEntity.badRequest().body("Subject not found");
        
        Optional<ClassSection> classSectionOpt = classSectionRepository.findById(classSectionId);
        if (classSectionOpt.isEmpty()) return ResponseEntity.badRequest().body("ClassSection not found");

        FacultySubjectAssignment assignment = new FacultySubjectAssignment();
        assignment.setFaculty(facultyOpt.get());
        assignment.setSubject(subjectOpt.get());
        assignment.setClassSection(classSectionOpt.get());
        
        if (request.getActive() != null) {
            assignment.setActive(request.getActive());
        }

        return ResponseEntity.ok(assignmentRepository.save(assignment));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAssignment(@PathVariable Long id, @Valid @RequestBody AssignmentRequest request) {
        Long assignmentId = Objects.requireNonNull(id, "assignment id is required");
        return assignmentRepository.findById(assignmentId).map(assignment -> {
            Long facultyId = request.getFacultyId();
            if (facultyId != null) {
                Optional<User> facultyOpt = userRepository.findById(Objects.requireNonNull(facultyId));
                if (facultyOpt.isPresent()) assignment.setFaculty(facultyOpt.get());
                else return ResponseEntity.badRequest().body("Faculty not found");
            }
            
            Long subjectId = request.getSubjectId();
            if (subjectId != null) {
                Optional<Subject> subjectOpt = subjectRepository.findById(Objects.requireNonNull(subjectId));
                if (subjectOpt.isPresent()) assignment.setSubject(subjectOpt.get());
                else return ResponseEntity.badRequest().body("Subject not found");
            }
            
            Long classSectionId = request.getClassSectionId();
            if (classSectionId != null) {
                Optional<ClassSection> classSectionOpt =
                        classSectionRepository.findById(Objects.requireNonNull(classSectionId));
                if (classSectionOpt.isPresent()) assignment.setClassSection(classSectionOpt.get());
                else return ResponseEntity.badRequest().body("ClassSection not found");
            }
            
            if (request.getActive() != null) {
                assignment.setActive(request.getActive());
            }

            return ResponseEntity.ok(assignmentRepository.save(Objects.requireNonNull(assignment)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id) {
        Long assignmentId = Objects.requireNonNull(id, "assignment id is required");
        if (!assignmentRepository.existsById(assignmentId)) return ResponseEntity.notFound().build();
        assignmentRepository.deleteById(assignmentId);
        return ResponseEntity.noContent().build();
    }
}
