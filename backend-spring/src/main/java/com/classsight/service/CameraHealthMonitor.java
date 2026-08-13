package com.classsight.service;

import com.classsight.entity.Camera;
import com.classsight.repository.CameraRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class CameraHealthMonitor {
    private final CameraRepository cameraRepository;
    private final RtspFrameProbeService probeService;

    public CameraHealthMonitor(CameraRepository cameraRepository, RtspFrameProbeService probeService) {
        this.cameraRepository = cameraRepository;
        this.probeService = probeService;
    }

    @Scheduled(fixedDelayString = "${classsight.camera.health-interval-ms:30000}", initialDelayString = "${classsight.camera.health-initial-delay-ms:5000}")
    @Transactional
    public void checkConfiguredCameras() {
        for (Camera camera : cameraRepository.findAll()) {
            if (camera.getStreamUrl() == null || camera.getStreamUrl().isBlank()) continue;
            RtspFrameProbeService.ProbeResult result = probeService.probe(camera.getStreamUrl());
            camera.setLastCheckedAt(LocalDateTime.now());
            camera.setLastError(result.success() ? null : result.message());
            camera.setStatus(result.success() ? Camera.CameraStatus.ONLINE : Camera.CameraStatus.OFFLINE);
            cameraRepository.save(camera);
        }
    }
}
