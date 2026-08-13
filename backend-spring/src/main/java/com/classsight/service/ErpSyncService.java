package com.classsight.service;

import com.classsight.entity.AttendanceSession;
import com.classsight.entity.ErpSyncAudit;
import com.classsight.entity.ErpSyncRecord;
import com.classsight.repository.AttendanceSessionRepository;
import com.classsight.repository.ErpSyncAuditRepository;
import com.classsight.repository.ErpSyncRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Service
public class ErpSyncService {
    private final AttendanceSessionRepository sessionRepository;
    private final ErpSyncRecordRepository syncRepository;
    private final ErpSyncAuditRepository auditRepository;
    private final LocalCsvErpProvider provider;

    public ErpSyncService(AttendanceSessionRepository sessionRepository,
                          ErpSyncRecordRepository syncRepository,
                          ErpSyncAuditRepository auditRepository,
                          LocalCsvErpProvider provider) {
        this.sessionRepository = sessionRepository;
        this.syncRepository = syncRepository;
        this.auditRepository = auditRepository;
        this.provider = provider;
    }

    @Transactional
    public SyncResult exportOne(Long sessionId, String actor, boolean simulateFailure) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session " + sessionId + " was not found"));
        ErpSyncRecord record = syncRepository.findBySessionId(sessionId).orElseGet(() -> {
            ErpSyncRecord created = new ErpSyncRecord();
            created.setSession(session);
            created.setStatus(ErpSyncRecord.SyncStatus.PENDING);
            created.setActor(actor);
            return syncRepository.save(created);
        });
        if (record.getStatus() == ErpSyncRecord.SyncStatus.SYNCED && !simulateFailure) {
            return new SyncResult(sessionId, record.getStatus().name(), true, true, record.getExportPath(), record.getAttemptCount(), "Already synced; idempotent no-op");
        }
        transition(record, ErpSyncRecord.SyncStatus.SYNCING, actor, simulateFailure ? "Simulated failure injection requested" : "Local export started");
        record.setAttemptCount(record.getAttemptCount() + 1);
        record.setLastError(null);
        syncRepository.save(record);
        if (simulateFailure) {
            record.setLastError("SIMULATED_FAILURE_INJECTION");
            transition(record, ErpSyncRecord.SyncStatus.FAILED, actor, "Simulated failure; no external ERP call was made");
            syncRepository.save(record);
            return new SyncResult(sessionId, record.getStatus().name(), false, false, null, record.getAttemptCount(), record.getLastError());
        }
        ErpProvider.ExportResult export = provider.submitAttendance(List.of(sessionId));
        if (!export.generated()) {
            record.setLastError(export.message());
            transition(record, ErpSyncRecord.SyncStatus.FAILED, actor, export.message());
            syncRepository.save(record);
            return new SyncResult(sessionId, record.getStatus().name(), false, false, null, record.getAttemptCount(), export.message());
        }
        record.setExportPath(export.path().toString());
        transition(record, ErpSyncRecord.SyncStatus.SYNCED, actor, export.message());
        syncRepository.save(record);
        return new SyncResult(sessionId, record.getStatus().name(), false, true, record.getExportPath(), record.getAttemptCount(), export.message());
    }

    @Transactional
    public List<SyncResult> export(List<Long> sessionIds, String actor, boolean simulateFailure) {
        List<SyncResult> results = new ArrayList<>();
        for (Long sessionId : sessionIds) results.add(exportOne(sessionId, actor, simulateFailure));
        return results;
    }

    @Transactional(readOnly = true)
    public List<ErpSyncRecord> list() { return syncRepository.findAll(); }

    @Transactional(readOnly = true)
    public List<ErpSyncAudit> audit(Long recordId) { return auditRepository.findBySyncRecordIdOrderByTransitionedAtAsc(recordId); }

    private void transition(ErpSyncRecord record, ErpSyncRecord.SyncStatus next, String actor, String note) {
        String previous = record.getStatus() == null ? null : record.getStatus().name();
        record.setStatus(next);
        record.setActor(actor);
        ErpSyncAudit audit = new ErpSyncAudit();
        audit.setSyncRecord(record);
        audit.setFromStatus(previous);
        audit.setToStatus(next.name());
        audit.setActor(actor);
        audit.setNote(note);
        auditRepository.save(audit);
    }

    public record SyncResult(Long sessionId, String status, boolean idempotentNoOp, boolean successful,
                             String exportPath, int attemptCount, String message) {}
}
