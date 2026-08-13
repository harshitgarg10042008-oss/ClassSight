package com.classsight.controller;

import com.classsight.dto.ClassSectionRequest;
import com.classsight.entity.ClassSection;
import com.classsight.repository.ClassSectionRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/class-sections")
public class AdminClassSectionController {
    private final ClassSectionRepository classSectionRepository;

    public AdminClassSectionController(ClassSectionRepository classSectionRepository) {
        this.classSectionRepository = classSectionRepository;
    }

    @GetMapping
    public List<ClassSection> getAllClassSections() {
        return classSectionRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<ClassSection> createClassSection(@Valid @RequestBody ClassSectionRequest request) {
        ClassSection section = new ClassSection();
        section.setName(request.getName());
        section.setDescription(request.getDescription());
        section.setAcademicYear(request.getAcademicYear());
        if (request.getActive() != null) {
            section.setActive(request.getActive());
        }
        return ResponseEntity.ok(classSectionRepository.save(section));
    }
}
