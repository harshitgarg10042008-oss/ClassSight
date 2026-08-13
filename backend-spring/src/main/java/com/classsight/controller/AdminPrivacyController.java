package com.classsight.controller;

import com.classsight.service.PrivacyRetentionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin/privacy")
public class AdminPrivacyController {
    private final PrivacyRetentionService retentionService;

    public AdminPrivacyController(PrivacyRetentionService retentionService) {
        this.retentionService = retentionService;
    }

    @PostMapping("/retention/run")
    public ResponseEntity<Map<String, Object>> runRetention() {
        int deleted = retentionService.deleteExpiredRawCaptures();
        return ResponseEntity.ok(Map.of(
                "deletedFiles", deleted,
                "retentionDays", retentionService.retentionDays()));
    }
}
