package com.classsight.repository;

import com.classsight.entity.ErpSyncAudit;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ErpSyncAuditRepository extends JpaRepository<ErpSyncAudit, Long> {
    List<ErpSyncAudit> findBySyncRecordIdOrderByTransitionedAtAsc(Long syncRecordId);
}
