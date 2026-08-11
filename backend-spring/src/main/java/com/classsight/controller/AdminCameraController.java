package com.classsight.controller;

import com.classsight.dto.CameraRequest;
import com.classsight.entity.Camera;
import com.classsight.entity.Room;
import com.classsight.repository.CameraRepository;
import com.classsight.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/admin/cameras")
public class AdminCameraController {

    @Autowired
    private CameraRepository cameraRepository;

    @Autowired
    private RoomRepository roomRepository;

    @GetMapping
    public List<Camera> getAllCameras() {
        return cameraRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createCamera(@Valid @RequestBody CameraRequest request) {
        Optional<Room> roomOpt = roomRepository.findById(request.getRoomId());
        if (roomOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Room not found");
        }

        Camera camera = new Camera();
        camera.setName(request.getName());
        camera.setRoom(roomOpt.get());
        
        // Default to ONLINE if not specified
        if (request.getStatus() != null) {
            camera.setStatus(request.getStatus());
        } else {
            camera.setStatus(Camera.CameraStatus.ONLINE);
        }

        return ResponseEntity.ok(cameraRepository.save(camera));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCamera(@PathVariable Long id, @Valid @RequestBody CameraRequest request) {
        return cameraRepository.findById(id).map(camera -> {
            if (request.getName() != null) camera.setName(request.getName());
            
            if (request.getRoomId() != null) {
                Optional<Room> roomOpt = roomRepository.findById(request.getRoomId());
                if (roomOpt.isPresent()) {
                    camera.setRoom(roomOpt.get());
                } else {
                    return ResponseEntity.badRequest().body("Room not found");
                }
            }
            
            if (request.getStatus() != null) {
                camera.setStatus(request.getStatus());
            }
            
            return ResponseEntity.ok(cameraRepository.save(camera));
        }).orElse(ResponseEntity.notFound().build());
    }
}
