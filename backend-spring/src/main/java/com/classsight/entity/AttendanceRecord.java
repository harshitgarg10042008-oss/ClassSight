package com.classsight.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "session_id", nullable = false)
    private AttendanceSession session;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status;

    @Column(precision = 5, scale = 4)
    private BigDecimal confidenceScore;

    @Column(name = "review_status")
    private ReviewStatus reviewStatus;

    @Column(name = "quality_warning", length = 2000)
    private String qualityWarning;

    @Column(name = "face_size_ratio")
    private Double faceSizeRatio;

    @Column(name = "recognition_state", length = 32)
    private String recognitionState;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum AttendanceStatus {
        PRESENT,
        ABSENT,
        REVIEW
    }

    public enum ReviewStatus {
        PENDING,
        APPROVED,
        REJECTED
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public AttendanceSession getSession() {
        return session;
    }

    public void setSession(AttendanceSession session) {
        this.session = session;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public void setStatus(AttendanceStatus status) {
        this.status = status;
    }

    public BigDecimal getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(BigDecimal confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public ReviewStatus getReviewStatus() {
        return reviewStatus;
    }

    public void setReviewStatus(ReviewStatus reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public String getQualityWarning() {
        return qualityWarning;
    }

    public void setQualityWarning(String qualityWarning) {
        this.qualityWarning = qualityWarning;
    }

    public String getRecognitionState() {
        return recognitionState;
    }

    public void setRecognitionState(String recognitionState) {
        this.recognitionState = recognitionState;
    }

    public Double getFaceSizeRatio() {
        return faceSizeRatio;
    }

    public void setFaceSizeRatio(Double faceSizeRatio) {
        this.faceSizeRatio = faceSizeRatio;
    }

    public Long getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(Long reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
