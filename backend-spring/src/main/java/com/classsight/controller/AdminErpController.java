package com.classsight.controller;

import com.classsight.dto.ErpSessionRequest;
import com.classsight.entity.ErpSyncAudit;
import com.classsight.entity.ErpSyncRecord;
import com.classsight.service.ErpProvider;
import com.classsight.service.ErpSyncService;
import com.classsight.service.LocalCsvErpProvider;
import com.classsight.service.MockErpProvider;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/erp")
public class AdminErpController {
    private final LocalCsvErpProvider provider;
    private final ErpSyncService syncService;

    public AdminErpController(LocalCsvErpProvider provider, ErpSyncService syncService) {
        this.provider = provider;
        this.syncService = syncService;
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

    @PostMapping("/sync")
    public ResponseEntity<List<ErpSyncService.SyncResult>> sync(
            @Valid @RequestBody ErpSessionRequest request,
            @RequestParam(defaultValue = "false") boolean simulateFailure,
            @AuthenticationPrincipal com.classsight.entity.User actor) {
        String username = actor == null ? "admin" : actor.getUsername();
        return ResponseEntity.ok(syncService.export(request.getSessionIds(), username, simulateFailure));
    }

    @PostMapping("/mock/{scenario}/{sessionId}")
    public ResponseEntity<ErpSyncService.SyncResult> mock(
            @PathVariable MockErpProvider.Scenario scenario,
            @PathVariable Long sessionId,
            @AuthenticationPrincipal com.classsight.entity.User actor) {
        String username = actor == null ? "admin" : actor.getUsername();
        return ResponseEntity.ok(syncService.mockScenario(sessionId, username, scenario));
    }

    @GetMapping("/sync-records")
    public ResponseEntity<List<ErpSyncRecord>> syncRecords() {
        return ResponseEntity.ok(syncService.list());
    }

    @GetMapping("/sync-records/{recordId}/audit")
    public ResponseEntity<List<ErpSyncAudit>> audit(@PathVariable Long recordId) {
        return ResponseEntity.ok(syncService.audit(recordId));
    }

    @GetMapping("/status")
    public ResponseEntity<ErpProvider.SubmissionStatus> status(@RequestParam String fileName) {
        Path requested = provider.exportDirectory().resolve(fileName).normalize();
        if (!requested.startsWith(provider.exportDirectory()) || fileName.contains("/") || fileName.contains("\\")) {
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
