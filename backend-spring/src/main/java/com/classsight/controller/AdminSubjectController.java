package com.classsight.controller;

import com.classsight.dto.SubjectRequest;
import com.classsight.entity.Subject;
import com.classsight.repository.SubjectRepository;
import com.classsight.repository.FacultySubjectAssignmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/admin/subjects")
public class AdminSubjectController {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private FacultySubjectAssignmentRepository assignmentRepository;

    @GetMapping
    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Subject> createSubject(@Valid @RequestBody SubjectRequest request) {
        Subject subject = new Subject();
        subject.setCode(request.getCode());
        subject.setName(request.getName());
        if (request.getDescription() != null) subject.setDescription(request.getDescription());
        if (request.getActive() != null) subject.setActive(request.getActive());

        return ResponseEntity.ok(subjectRepository.save(subject));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subject> updateSubject(@PathVariable Long id, @Valid @RequestBody SubjectRequest request) {
        return subjectRepository.findById(id).map(subject -> {
            if (request.getCode() != null) subject.setCode(request.getCode());
            if (request.getName() != null) subject.setName(request.getName());
            if (request.getDescription() != null) subject.setDescription(request.getDescription());
            if (request.getActive() != null) subject.setActive(request.getActive());
            
            return ResponseEntity.ok(subjectRepository.save(subject));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSubject(@PathVariable Long id) {
        if (!subjectRepository.existsById(id)) return ResponseEntity.notFound().build();
        if (assignmentRepository.existsBySubjectId(id)) {
            return ResponseEntity.status(409).body("Subject cannot be deleted while assignments reference it");
        }
        subjectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
