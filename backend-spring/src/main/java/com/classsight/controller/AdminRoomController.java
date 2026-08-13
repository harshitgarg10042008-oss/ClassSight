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
        if (request.getBuilding() != null) room.setBuilding(request.getBuilding());
        if (request.getFloor() != null) room.setFloor(request.getFloor());
        if (request.getCapacity() != null) room.setCapacity(request.getCapacity());
        if (request.getActive() != null) room.setActive(request.getActive());

        return ResponseEntity.ok(roomRepository.save(room));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Room> updateRoom(@PathVariable Long id, @Valid @RequestBody RoomRequest request) {
        return roomRepository.findById(id).map(room -> {
            if (request.getName() != null) room.setName(request.getName());
            if (request.getBuilding() != null) room.setBuilding(request.getBuilding());
            if (request.getFloor() != null) room.setFloor(request.getFloor());
            if (request.getCapacity() != null) room.setCapacity(request.getCapacity());
            if (request.getActive() != null) room.setActive(request.getActive());
            return ResponseEntity.ok(roomRepository.save(room));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoom(@PathVariable Long id) {
        if (!roomRepository.existsById(id)) return ResponseEntity.notFound().build();
        if (cameraRepository.existsByRoomId(id)) {
            return ResponseEntity.status(409).body("Room cannot be deleted while cameras reference it");
        }
        roomRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
