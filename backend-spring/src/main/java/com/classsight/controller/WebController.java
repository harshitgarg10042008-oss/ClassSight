package com.classsight.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

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
}
