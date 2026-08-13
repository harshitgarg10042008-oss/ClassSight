package com.classsight.repository;

import com.classsight.entity.ErpSyncRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ErpSyncRecordRepository extends JpaRepository<ErpSyncRecord, Long> {
    Optional<ErpSyncRecord> findBySessionId(Long sessionId);
}
