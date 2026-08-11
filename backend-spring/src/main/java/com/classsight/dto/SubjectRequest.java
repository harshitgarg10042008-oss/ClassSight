package com.classsight.dto;

import jakarta.validation.constraints.NotBlank;

public class SubjectRequest {
    @NotBlank
    private String code;
    @NotBlank
    private String name;
    private String description;
    private Boolean active;

    // Getters and Setters
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
