package com.classsight.controller;

import com.classsight.entity.FacultySubjectAssignment;
import com.classsight.entity.User;
import com.classsight.repository.FacultySubjectAssignmentRepository;
import com.classsight.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/teacher/assignments")
public class TeacherController {

    @Autowired
    private FacultySubjectAssignmentRepository assignmentRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getMyAssignments(Authentication authentication) {
        String username = authentication.getName();
        Optional<User> userOpt = userRepository.findByUsername(username);
        
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        
        List<FacultySubjectAssignment> assignments = assignmentRepository.findByFacultyIdAndActiveTrue(userOpt.get().getId());
        return ResponseEntity.ok(assignments);
    }
}
