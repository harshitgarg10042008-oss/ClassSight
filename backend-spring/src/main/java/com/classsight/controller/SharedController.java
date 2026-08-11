package com.classsight.controller;

import com.classsight.entity.Camera;
import com.classsight.entity.ClassSection;
import com.classsight.entity.Room;
import com.classsight.repository.CameraRepository;
import com.classsight.repository.ClassSectionRepository;
import com.classsight.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SharedController {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private CameraRepository cameraRepository;

    @Autowired
    private ClassSectionRepository classSectionRepository;

    @GetMapping("/rooms")
    public List<Room> getActiveRooms() {
        return roomRepository.findByActiveTrue();
    }

    @GetMapping("/cameras")
    public List<Camera> getActiveCameras() {
        return cameraRepository.findByStatus(Camera.CameraStatus.ONLINE);
    }

    @GetMapping("/class-sections")
    public List<ClassSection> getAllClassSections() {
        return classSectionRepository.findAll();
    }
}
