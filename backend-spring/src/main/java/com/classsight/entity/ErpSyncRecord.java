package com.classsight.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "erp_sync_records", uniqueConstraints = @UniqueConstraint(name = "uk_erp_sync_session", columnNames = "session_id"))
public class ErpSyncRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private AttendanceSession session;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private SyncStatus status;
    @Column(name = "export_path", length = 1024)
    private String exportPath;
    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;
    @Column(name = "last_error", length = 4000)
    private String lastError;
    @Column(name = "actor", nullable = false, length = 120)
    private String actor;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public enum SyncStatus { PENDING, SYNCING, SYNCED, FAILED, PARTIAL }
    public Long getId(){return id;} public AttendanceSession getSession(){return session;} public void setSession(AttendanceSession v){session=v;}
    public SyncStatus getStatus(){return status;} public void setStatus(SyncStatus v){status=v;}
    public String getExportPath(){return exportPath;} public void setExportPath(String v){exportPath=v;}
    public int getAttemptCount(){return attemptCount;} public void setAttemptCount(int v){attemptCount=v;}
    public String getLastError(){return lastError;} public void setLastError(String v){lastError=v;}
    public String getActor(){return actor;} public void setActor(String v){actor=v;}
    public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getUpdatedAt(){return updatedAt;}
}
