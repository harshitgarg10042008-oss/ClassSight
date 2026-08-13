package com.classsight.service;

public interface CameraFrameAdapter {
    FrameResult captureFrame(Long cameraId);
    record FrameResult(boolean success, String message, long latencyMs, int width, int height, Long bytes, String path) {}
}
