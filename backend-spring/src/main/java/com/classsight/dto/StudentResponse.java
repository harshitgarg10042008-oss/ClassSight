package com.classsight.dto;

import com.classsight.entity.Student;
import com.classsight.entity.StudentEnrollment;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class StudentResponse {
    private Long id;
    private String rollNumber;
    private String firstName;
    private String lastName;
    private String fullName;
    private String name;
    private Boolean faceRegistered;
    private LocalDateTime enrolledDate;
    private LocalDate dateOfBirth;
    private Boolean active;
    private Boolean hasFaceEmbedding;
    private Integer embeddingCount;
    private Boolean consentGiven;
    private Boolean facePhotoAvailable;
    private LocalDateTime consentedAt;
    private Long classSectionId;
    private String classSectionName;
    private List<Long> classSectionIds = new ArrayList<>();
    private List<String> classSectionNames = new ArrayList<>();
    private List<Long> subjectIds = new ArrayList<>();
    private boolean sectionWideEnrollment;

    public StudentResponse() {}

    public StudentResponse(Student student) {
        this.id = student.getId();
        this.rollNumber = student.getRollNumber();
        this.firstName = student.getFirstName();
        this.lastName = student.getLastName();
        this.fullName = ((student.getFirstName() != null ? student.getFirstName() : "") + " " +
                (student.getLastName() != null ? student.getLastName() : "")).trim();
        this.name = this.fullName;
        this.enrolledDate = student.getCreatedAt();
        this.dateOfBirth = student.getDateOfBirth();
        this.active = student.getActive();
        long validReferences = student.getFaceEmbeddings() == null ? 0 : student.getFaceEmbeddings().stream()
                .filter(reference -> isValidEmbedding(reference.getEmbedding())).count();
        if (validReferences == 0 && isValidEmbedding(student.getFaceEmbedding())) validReferences = 1;
        this.hasFaceEmbedding = validReferences > 0;
        this.faceRegistered = this.hasFaceEmbedding;
        this.embeddingCount = Math.toIntExact(validReferences);
        this.consentGiven = student.getConsentGiven();
        this.facePhotoAvailable = student.getFacePhotoPath() != null && !student.getFacePhotoPath().isBlank();
        this.consentedAt = student.getConsentedAt();
        if (student.getClassSection() != null) {
            this.classSectionId = student.getClassSection().getId();
            this.classSectionName = student.getClassSection().getName();
            this.classSectionIds.add(student.getClassSection().getId());
            this.classSectionNames.add(student.getClassSection().getName());
        }
    }

    public StudentResponse(Student student, List<StudentEnrollment> enrollments) {
        this(student);
        Map<Long, String> sections = new LinkedHashMap<>();
        if (student.getClassSection() != null) sections.put(student.getClassSection().getId(), student.getClassSection().getName());
        if (enrollments != null) for (StudentEnrollment enrollment : enrollments) {
            if (enrollment.getClassSection() != null) sections.put(enrollment.getClassSection().getId(), enrollment.getClassSection().getName());
            if (enrollment.getSubject() == null) sectionWideEnrollment = true;
            else subjectIds.add(enrollment.getSubject().getId());
        }
        classSectionIds = new ArrayList<>(sections.keySet());
        classSectionNames = new ArrayList<>(sections.values());
        subjectIds = subjectIds.stream().distinct().toList();
    }

    private static boolean isValidEmbedding(List<Double> embedding) {
        return embedding != null && embedding.size() == 128 && embedding.stream()
                .allMatch(value -> value != null && Double.isFinite(value));
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRollNumber() { return rollNumber; }
    public void setRollNumber(String rollNumber) { this.rollNumber = rollNumber; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Boolean getFaceRegistered() { return faceRegistered; }
    public void setFaceRegistered(Boolean faceRegistered) { this.faceRegistered = faceRegistered; }

    public LocalDateTime getEnrolledDate() { return enrolledDate; }
    public void setEnrolledDate(LocalDateTime enrolledDate) { this.enrolledDate = enrolledDate; }

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
    public Boolean getFacePhotoAvailable() { return facePhotoAvailable; }
    public void setFacePhotoAvailable(Boolean facePhotoAvailable) { this.facePhotoAvailable = facePhotoAvailable; }

    public LocalDateTime getConsentedAt() { return consentedAt; }
    public void setConsentedAt(LocalDateTime consentedAt) { this.consentedAt = consentedAt; }

    public Long getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Long classSectionId) { this.classSectionId = classSectionId; }

    public String getClassSectionName() { return classSectionName; }
    public void setClassSectionName(String classSectionName) { this.classSectionName = classSectionName; }
    public List<Long> getClassSectionIds() { return classSectionIds; }
    public void setClassSectionIds(List<Long> classSectionIds) { this.classSectionIds = classSectionIds; }
    public List<String> getClassSectionNames() { return classSectionNames; }
    public void setClassSectionNames(List<String> classSectionNames) { this.classSectionNames = classSectionNames; }
    public List<Long> getSubjectIds() { return subjectIds; }
    public void setSubjectIds(List<Long> subjectIds) { this.subjectIds = subjectIds; }
    public boolean isSectionWideEnrollment() { return sectionWideEnrollment; }
    public void setSectionWideEnrollment(boolean sectionWideEnrollment) { this.sectionWideEnrollment = sectionWideEnrollment; }
}
