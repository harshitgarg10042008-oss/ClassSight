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
        Optional<User> facultyOpt = userRepository.findById(request.getFacultyId());
        if (facultyOpt.isEmpty()) return ResponseEntity.badRequest().body("Faculty not found");
        
        Optional<Subject> subjectOpt = subjectRepository.findById(request.getSubjectId());
        if (subjectOpt.isEmpty()) return ResponseEntity.badRequest().body("Subject not found");
        
        Optional<ClassSection> classSectionOpt = classSectionRepository.findById(request.getClassSectionId());
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
        return assignmentRepository.findById(id).map(assignment -> {
            if (request.getFacultyId() != null) {
                Optional<User> facultyOpt = userRepository.findById(request.getFacultyId());
                if (facultyOpt.isPresent()) assignment.setFaculty(facultyOpt.get());
                else return ResponseEntity.badRequest().body("Faculty not found");
            }
            
            if (request.getSubjectId() != null) {
                Optional<Subject> subjectOpt = subjectRepository.findById(request.getSubjectId());
                if (subjectOpt.isPresent()) assignment.setSubject(subjectOpt.get());
                else return ResponseEntity.badRequest().body("Subject not found");
            }
            
            if (request.getClassSectionId() != null) {
                Optional<ClassSection> classSectionOpt = classSectionRepository.findById(request.getClassSectionId());
                if (classSectionOpt.isPresent()) assignment.setClassSection(classSectionOpt.get());
                else return ResponseEntity.badRequest().body("ClassSection not found");
            }
            
            if (request.getActive() != null) {
                assignment.setActive(request.getActive());
            }

            return ResponseEntity.ok(assignmentRepository.save(assignment));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id) {
        if (!assignmentRepository.existsById(id)) return ResponseEntity.notFound().build();
        assignmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
