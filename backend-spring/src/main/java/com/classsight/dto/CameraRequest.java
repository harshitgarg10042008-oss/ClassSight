package com.classsight.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import com.classsight.entity.Camera.CameraStatus;

public class CameraRequest {
    @NotBlank
    private String name;
    @NotNull
    private Long roomId;
    private CameraStatus status;
    private String streamUrl;
    private String credentials;

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }
    public CameraStatus getStatus() { return status; }
    public void setStatus(CameraStatus status) { this.status = status; }
    public String getStreamUrl() { return streamUrl; }
    public void setStreamUrl(String streamUrl) { this.streamUrl = streamUrl; }
    public String getCredentials() { return credentials; }
    public void setCredentials(String credentials) { this.credentials = credentials; }
}
