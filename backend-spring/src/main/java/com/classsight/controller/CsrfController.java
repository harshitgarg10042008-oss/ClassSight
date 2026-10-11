package com.classsight.controller;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class CsrfController {
    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        if (token == null) {
            return Map.of("token", "stateless-token", "headerName", "X-XSRF-TOKEN");
        }
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }
}
