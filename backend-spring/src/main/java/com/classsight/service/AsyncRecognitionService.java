package com.classsight.service;

import com.classsight.config.RabbitConfig;
import com.classsight.entity.AttendanceSession;
import com.classsight.entity.Student;
import com.classsight.repository.AttendanceSessionRepository;
import com.classsight.repository.StudentRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AsyncRecognitionService {
    private final RabbitTemplate rabbitTemplate;
    private final AttendanceSessionRepository sessionRepository;
    private final StudentRepository studentRepository;
    private final AttendanceRecognitionService recognitionService;
    private final double threshold;
    private final boolean edgeCropEnabled;

    public AsyncRecognitionService(RabbitTemplate rabbitTemplate,
                                   AttendanceSessionRepository sessionRepository,
                                   StudentRepository studentRepository,
                                   AttendanceRecognitionService recognitionService,
                                   @Value("${attendance.recognition.threshold:0.6}") double threshold,
                                   @Value("${attendance.recognition.edge-crop-enabled:false}") boolean edgeCropEnabled) {
        this.rabbitTemplate = rabbitTemplate;
        this.sessionRepository = sessionRepository;
        this.studentRepository = studentRepository;
        this.recognitionService = recognitionService;
        this.threshold = threshold;
        this.edgeCropEnabled = edgeCropEnabled;
    }

    public void enqueue(Long sessionId, String objectKey) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with id: " + sessionId));
        List<Map<String, Object>> enrolled = studentRepository.findByClassSectionAndActiveTrue(session.getClassSection())
                .stream().map(this::studentPayload).toList();
        Map<String, Object> message = new HashMap<>();
        message.put("sessionId", sessionId);
        message.put("objectKey", objectKey);
        message.put("distanceThreshold", threshold);
        message.put("enrolledStudents", enrolled);
        message.put("edgeCrop", edgeCropEnabled);
        rabbitTemplate.convertAndSend(RabbitConfig.CAPTURE_EXCHANGE, "capture.request", message);
    }

    @RabbitListener(queues = RabbitConfig.RESULT_QUEUE)
    public void consumeResult(Map<String, Object> message) {
        Number sessionId = (Number) message.get("sessionId");
        @SuppressWarnings("unchecked") Map<String, Object> recognition = (Map<String, Object>) message.get("recognition");
        if (sessionId == null || recognition == null) throw new IllegalArgumentException("Invalid recognition result message");
        recognitionService.processRecognitionResult(sessionId.longValue(), recognition);
    }

    private Map<String, Object> studentPayload(Student student) {
        Map<String, Object> item = new HashMap<>();
        item.put("student_id", student.getId());
        item.put("roll_number", student.getRollNumber());
        item.put("embedding", student.getFaceEmbedding());
        item.put("embeddings", student.getFaceEmbeddings() == null ? List.of() : student.getFaceEmbeddings().stream().map(com.classsight.entity.StudentFaceEmbedding::getEmbedding).toList());
        return item;
    }
}

