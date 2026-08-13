package com.classsight.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class StudentCreateRequest {
    @NotBlank
    private String rollNumber;
    @NotBlank
    private String firstName;
    @NotBlank
    private String lastName;
    @NotNull
    private Long classSectionId;
    private Boolean active;

    public String getRollNumber() { return rollNumber; }
    public void setRollNumber(String rollNumber) { this.rollNumber = rollNumber; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public Long getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Long classSectionId) { this.classSectionId = classSectionId; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
