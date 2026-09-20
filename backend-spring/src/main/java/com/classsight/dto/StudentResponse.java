package com.classsight.dto;

import com.classsight.entity.Student;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class StudentResponse {
    private Long id;
    private String rollNumber;
    private String firstName;
    private String lastName;
    private String fullName;
    private LocalDate dateOfBirth;
    private Boolean active;
    private Boolean hasFaceEmbedding;
    private Integer embeddingCount;
    private Boolean consentGiven;
    private LocalDateTime consentedAt;
    private Long classSectionId;
    private String classSectionName;

    public StudentResponse() {}

    public StudentResponse(Student student) {
        this.id = student.getId();
        this.rollNumber = student.getRollNumber();
        this.firstName = student.getFirstName();
        this.lastName = student.getLastName();
        this.fullName = (student.getFirstName() != null ? student.getFirstName() : "") + " " +
                (student.getLastName() != null ? student.getLastName() : "");
        this.dateOfBirth = student.getDateOfBirth();
        this.active = student.getActive();
        this.hasFaceEmbedding = student.getFaceEmbedding() != null && !student.getFaceEmbedding().isEmpty();
        this.embeddingCount = student.getFaceEmbeddings() != null ? student.getFaceEmbeddings().size() : 0;
        this.consentGiven = student.getConsentGiven();
        this.consentedAt = student.getConsentedAt();
        if (student.getClassSection() != null) {
            this.classSectionId = student.getClassSection().getId();
            this.classSectionName = student.getClassSection().getName();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRollNumber() { return rollNumber; }
    public void setRollNumber(String rollNumber) { this.rollNumber = rollNumber; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Boolean getHasFaceEmbedding() { return hasFaceEmbedding; }
    public void setHasFaceEmbedding(Boolean hasFaceEmbedding) { this.hasFaceEmbedding = hasFaceEmbedding; }

    public Integer getEmbeddingCount() { return embeddingCount; }
    public void setEmbeddingCount(Integer embeddingCount) { this.embeddingCount = embeddingCount; }

    public Boolean getConsentGiven() { return consentGiven; }
    public void setConsentGiven(Boolean consentGiven) { this.consentGiven = consentGiven; }

    public LocalDateTime getConsentedAt() { return consentedAt; }
    public void setConsentedAt(LocalDateTime consentedAt) { this.consentedAt = consentedAt; }

    public Long getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Long classSectionId) { this.classSectionId = classSectionId; }

    public String getClassSectionName() { return classSectionName; }
    public void setClassSectionName(String classSectionName) { this.classSectionName = classSectionName; }
}
