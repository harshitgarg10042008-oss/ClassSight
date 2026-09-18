package com.classsight.controller;

import com.classsight.dto.RoomRequest;
import com.classsight.entity.Room;
import com.classsight.repository.RoomRepository;
import com.classsight.repository.CameraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/admin/rooms")
public class AdminRoomController {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private CameraRepository cameraRepository;

    @GetMapping
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Room> createRoom(@Valid @RequestBody RoomRequest request) {
        Room room = new Room();
        room.setName(request.getName());
        if (request.getBuilding() != null)
            room.setBuilding(request.getBuilding());
        if (request.getFloor() != null)
            room.setFloor(request.getFloor());
        if (request.getCapacity() != null)
            room.setCapacity(request.getCapacity());
        if (request.getActive() != null)
            room.setActive(request.getActive());

        return ResponseEntity.ok(roomRepository.save(Objects.requireNonNull(room)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Room> updateRoom(@PathVariable Long id, @Valid @RequestBody RoomRequest request) {
        return roomRepository.findById(Objects.requireNonNull(id, "id")).map(room -> {
            if (request.getName() != null)
                room.setName(request.getName());
            if (request.getBuilding() != null)
                room.setBuilding(request.getBuilding());
            if (request.getFloor() != null)
                room.setFloor(request.getFloor());
            if (request.getCapacity() != null)
                room.setCapacity(request.getCapacity());
            if (request.getActive() != null)
                room.setActive(request.getActive());
            return ResponseEntity.ok(roomRepository.save(Objects.requireNonNull(room)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoom(@PathVariable Long id) {
        Long requiredId = Objects.requireNonNull(id, "id");
        if (!roomRepository.existsById(requiredId))
            return ResponseEntity.notFound().build();
        if (cameraRepository.existsByRoomId(requiredId)) {
            return ResponseEntity.status(409).body("Room cannot be deleted while cameras reference it");
        }
        roomRepository.deleteById(requiredId);
        return ResponseEntity.noContent().build();
    }
}
