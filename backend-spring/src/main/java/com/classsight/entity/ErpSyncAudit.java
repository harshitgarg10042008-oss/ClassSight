package com.classsight.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "erp_sync_audits")
public class ErpSyncAudit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sync_record_id", nullable = false)
    private ErpSyncRecord syncRecord;
    @Column(name = "from_status", length = 20)
    private String fromStatus;
    @Column(name = "to_status", nullable = false, length = 20)
    private String toStatus;
    @Column(nullable = false, length = 120)
    private String actor;
    @Column(length = 4000)
    private String note;
    @Column(name = "transitioned_at", nullable = false)
    private LocalDateTime transitionedAt;

    @PrePersist protected void onCreate() { transitionedAt = LocalDateTime.now(); }
    public Long getId(){return id;} public ErpSyncRecord getSyncRecord(){return syncRecord;} public void setSyncRecord(ErpSyncRecord v){syncRecord=v;}
    public String getFromStatus(){return fromStatus;} public void setFromStatus(String v){fromStatus=v;}
    public String getToStatus(){return toStatus;} public void setToStatus(String v){toStatus=v;}
    public String getActor(){return actor;} public void setActor(String v){actor=v;}
    public String getNote(){return note;} public void setNote(String v){note=v;}
    public LocalDateTime getTransitionedAt(){return transitionedAt;}
}
