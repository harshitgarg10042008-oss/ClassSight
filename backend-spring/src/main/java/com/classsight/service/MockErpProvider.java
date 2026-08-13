package com.classsight.service;

import com.classsight.entity.ErpSyncRecord;
import org.springframework.stereotype.Service;

@Service
public class MockErpProvider {
    public Result run(Scenario scenario) {
        return switch (scenario) {
            case SUCCESS -> new Result(scenario, ErpSyncRecord.SyncStatus.SYNCED, true, "Mock ERP accepted all rows");
            case DUPLICATE -> new Result(scenario, ErpSyncRecord.SyncStatus.SYNCED, true, "Mock ERP reported duplicate submission");
            case INVALID_STUDENT -> new Result(scenario, ErpSyncRecord.SyncStatus.FAILED, false, "Mock ERP rejected an invalid student identifier");
            case TIMEOUT -> new Result(scenario, ErpSyncRecord.SyncStatus.FAILED, false, "Mock ERP timeout injected for sandbox testing");
            case PARTIAL_SUCCESS -> new Result(scenario, ErpSyncRecord.SyncStatus.PARTIAL, false, "Mock ERP accepted some rows and rejected others");
        };
    }

    public enum Scenario { SUCCESS, DUPLICATE, INVALID_STUDENT, TIMEOUT, PARTIAL_SUCCESS }
    public record Result(Scenario scenario, ErpSyncRecord.SyncStatus status, boolean successful, String message) {}
}
