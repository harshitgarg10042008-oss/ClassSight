package com.classsight.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class WebController {

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

    @GetMapping("/review/{sessionId}")
    public String reviewPage(@PathVariable Long sessionId, org.springframework.ui.Model model) {
        model.addAttribute("sessionId", sessionId);
        return "review";
    }
}
