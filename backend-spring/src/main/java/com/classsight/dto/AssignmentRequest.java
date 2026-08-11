package com.classsight.dto;

import jakarta.validation.constraints.NotNull;

public class AssignmentRequest {
    @NotNull
    private Long facultyId;
    @NotNull
    private Long subjectId;
    @NotNull
    private Long classSectionId;
    private Boolean active;

    // Getters and Setters
    public Long getFacultyId() { return facultyId; }
    public void setFacultyId(Long facultyId) { this.facultyId = facultyId; }
    public Long getSubjectId() { return subjectId; }
    public void setSubjectId(Long subjectId) { this.subjectId = subjectId; }
    public Long getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Long classSectionId) { this.classSectionId = classSectionId; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
