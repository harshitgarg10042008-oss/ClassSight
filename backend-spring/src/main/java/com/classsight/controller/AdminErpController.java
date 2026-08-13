package com.classsight.controller;

import com.classsight.dto.ErpSessionRequest;
import com.classsight.service.ErpProvider;
import com.classsight.service.LocalCsvErpProvider;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/admin/erp")
public class AdminErpController {
    private final LocalCsvErpProvider provider;

    public AdminErpController(LocalCsvErpProvider provider) {
        this.provider = provider;
    }

    @PostMapping("/validate")
    public ResponseEntity<ErpProvider.ValidationResult> validate(@Valid @RequestBody ErpSessionRequest request) {
        return ResponseEntity.ok(provider.validateMappings(request.getSessionIds()));
    }

    @PostMapping("/export")
    public ResponseEntity<ErpProvider.ExportResult> export(@Valid @RequestBody ErpSessionRequest request) {
        ErpProvider.ExportResult result = provider.submitAttendance(request.getSessionIds());
        return result.generated() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    @GetMapping("/status")
    public ResponseEntity<ErpProvider.SubmissionStatus> status(@RequestParam String fileName) {
        Path requested = provider.exportDirectory().resolve(fileName).normalize();
        if (!requested.startsWith(provider.exportDirectory()) || fileName.contains("/\\")) {
            return ResponseEntity.badRequest().body(provider.getSubmissionStatus(null));
        }
        return ResponseEntity.ok(provider.getSubmissionStatus(requested));
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, String>> info() {
        return ResponseEntity.ok(Map.of(
                "provider", "LOCAL_CSV",
                "status", "ERP_UNAVAILABLE_LOCAL_GENERATION_ONLY",
                "exportDirectory", provider.exportDirectory().toString(),
                "format", "student_id,student_name,subject,date,status"
        ));
    }
}
