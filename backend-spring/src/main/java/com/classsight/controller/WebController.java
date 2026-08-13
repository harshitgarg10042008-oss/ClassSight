package com.classsight.controller;

import com.classsight.entity.User;
import com.classsight.repository.UserRepository;
import com.classsight.service.AttendanceReviewService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.security.Principal;

@Controller
public class WebController {

    private final AttendanceReviewService attendanceReviewService;
    private final UserRepository userRepository;

    public WebController(AttendanceReviewService attendanceReviewService, UserRepository userRepository) {
        this.attendanceReviewService = attendanceReviewService;
        this.userRepository = userRepository;
    }

    @GetMapping("/login")
    public String loginPage() {
        return "login";
    }

    @GetMapping("/select-room")
    public String selectRoomPage() {
        return "select-room";
    }

    @GetMapping("/select-subject")
    public String selectSubjectPage() {
        return "select-subject";
    }

    @GetMapping("/capture")
    public String capturePage() {
        return "capture";
    }

    @GetMapping("/analytics")
    public String analyticsPage() {
        return "analytics";
    }

    @GetMapping("/review/{sessionId}")
    public String reviewPage(@PathVariable Long sessionId, Principal principal, Model model) {
        User actor = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        attendanceReviewService.assertCanReview(sessionId, actor);
        model.addAttribute("sessionId", sessionId);
        return "review";
    }
}
