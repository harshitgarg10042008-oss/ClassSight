package com.classsight.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ClassSectionRequest {
    @NotBlank
    private String name;
    private String description;
    @NotNull
    private Integer academicYear;
    private Boolean active;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getAcademicYear() { return academicYear; }
    public void setAcademicYear(Integer academicYear) { this.academicYear = academicYear; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
