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
import java.util.Objects;

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
        if (request.getDescription() != null)
            subject.setDescription(request.getDescription());
        if (request.getActive() != null)
            subject.setActive(request.getActive());

        return ResponseEntity.ok(subjectRepository.save(Objects.requireNonNull(subject)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subject> updateSubject(@PathVariable Long id, @Valid @RequestBody SubjectRequest request) {
        return subjectRepository.findById(Objects.requireNonNull(id, "id")).map(subject -> {
            if (request.getCode() != null)
                subject.setCode(request.getCode());
            if (request.getName() != null)
                subject.setName(request.getName());
            if (request.getDescription() != null)
                subject.setDescription(request.getDescription());
            if (request.getActive() != null)
                subject.setActive(request.getActive());

            return ResponseEntity.ok(subjectRepository.save(Objects.requireNonNull(subject)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSubject(@PathVariable Long id) {
        Long requiredId = Objects.requireNonNull(id, "id");
        if (!subjectRepository.existsById(requiredId))
            return ResponseEntity.notFound().build();
        if (assignmentRepository.existsBySubjectId(requiredId)) {
            return ResponseEntity.status(409).body("Subject cannot be deleted while assignments reference it");
        }
        subjectRepository.deleteById(requiredId);
        return ResponseEntity.noContent().build();
    }
}
