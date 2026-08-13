package com.classsight.controller;

import com.classsight.dto.CameraRequest;
import com.classsight.entity.Camera;
import com.classsight.entity.Room;
import com.classsight.repository.CameraRepository;
import com.classsight.repository.RoomRepository;
import com.classsight.service.CameraCredentialService;
import com.classsight.service.RtspFrameProbeService;
import com.classsight.service.RtspCameraAdapter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/admin/cameras")
public class AdminCameraController {
    private final CameraRepository cameraRepository;
    private final RoomRepository roomRepository;
    private final CameraCredentialService credentialService;
    private final RtspFrameProbeService probeService;
    private final RtspCameraAdapter frameAdapter;

    public AdminCameraController(CameraRepository cameraRepository, RoomRepository roomRepository,
                                 CameraCredentialService credentialService, RtspFrameProbeService probeService,
                                 RtspCameraAdapter frameAdapter) {
        this.cameraRepository = cameraRepository;
        this.roomRepository = roomRepository;
        this.credentialService = credentialService;
        this.probeService = probeService;
        this.frameAdapter = frameAdapter;
    }

    @GetMapping
    public List<Camera> getAllCameras() { return cameraRepository.findAll(); }

    @PostMapping
    public ResponseEntity<?> createCamera(@Valid @RequestBody CameraRequest request) {
        Optional<Room> roomOpt = roomRepository.findById(request.getRoomId());
        if (roomOpt.isEmpty()) return ResponseEntity.badRequest().body("Room not found");
        Camera camera = new Camera();
        camera.setName(request.getName());
        camera.setRoom(roomOpt.get());
        camera.setStatus(request.getStatus() == null ? Camera.CameraStatus.ONLINE : request.getStatus());
        camera.setStreamUrl(request.getStreamUrl());
        camera.setCredentialsCiphertext(credentialService.encrypt(request.getCredentials()));
        return ResponseEntity.ok(cameraRepository.save(camera));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCamera(@PathVariable Long id, @Valid @RequestBody CameraRequest request) {
        return cameraRepository.findById(id).map(camera -> {
            if (request.getName() != null) camera.setName(request.getName());
            if (request.getRoomId() != null) {
                Optional<Room> roomOpt = roomRepository.findById(request.getRoomId());
                if (roomOpt.isEmpty()) return ResponseEntity.badRequest().body("Room not found");
                camera.setRoom(roomOpt.get());
            }
            if (request.getStatus() != null) camera.setStatus(request.getStatus());
            if (request.getStreamUrl() != null) camera.setStreamUrl(request.getStreamUrl());
            if (request.getCredentials() != null) camera.setCredentialsCiphertext(credentialService.encrypt(request.getCredentials()));
            return ResponseEntity.ok(cameraRepository.save(camera));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCamera(@PathVariable Long id) {
        if (!cameraRepository.existsById(id)) return ResponseEntity.notFound().build();
        cameraRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/capture-frame")
    public ResponseEntity<?> captureFrame(@PathVariable Long id) {
        RtspCameraAdapter.FrameResult result = frameAdapter.captureFrame(id);
        return result.success() ? ResponseEntity.ok(Map.of(
                "cameraId", id, "success", true, "message", result.message(), "latencyMs", result.latencyMs(),
                "width", result.width(), "height", result.height(), "bytes", result.bytes(), "path", result.path()))
                : ResponseEntity.status(502).body(Map.of("cameraId", id, "success", false, "message", result.message(), "latencyMs", result.latencyMs()));
    }

    @PostMapping("/{id}/test-connection")
    public ResponseEntity<?> testConnection(@PathVariable Long id) {
        return cameraRepository.findById(id).map(camera -> {
            RtspFrameProbeService.ProbeResult result = probeService.probe(camera.getStreamUrl());
            camera.setLastCheckedAt(LocalDateTime.now());
            camera.setLastError(result.success() ? null : result.message());
            camera.setStatus(result.success() ? Camera.CameraStatus.ONLINE : Camera.CameraStatus.OFFLINE);
            cameraRepository.save(camera);
            return ResponseEntity.ok(Map.of(
                    "cameraId", id,
                    "success", result.success(),
                    "status", camera.getStatus().name(),
                    "message", result.message(),
                    "latencyMs", result.latencyMs(),
                    "width", result.width(),
                    "height", result.height(),
                    "bytes", result.bytes() == null ? 0 : result.bytes(),
                    "checkedAt", camera.getLastCheckedAt().toString()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }
}
