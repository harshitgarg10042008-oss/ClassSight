package com.classsight.controller;

import com.classsight.service.Phase1SFaceService;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@Profile("golden-comparison")
@RequestMapping("/internal/golden")
public class GoldenComparisonController {
    private final Phase1SFaceService sFaceService;

    public GoldenComparisonController(Phase1SFaceService sFaceService) {
        this.sFaceService = sFaceService;
    }

    @PostMapping("/recognize")
    public ResponseEntity<Map<String, Object>> recognize(
            @RequestPart("image") MultipartFile image,
            @RequestPart("references") List<MultipartFile> references,
            @RequestParam("referenceIds") List<Long> referenceIds) throws IOException {
        if (references.size() != referenceIds.size()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "references and referenceIds must have equal length"));
        }
        List<Phase1SFaceService.StudentReference> enrolled = new ArrayList<>();
        for (int index = 0; index < references.size(); index++) {
            enrolled.add(new Phase1SFaceService.StudentReference(
                    referenceIds.get(index), String.valueOf(referenceIds.get(index)),
                    sFaceService.enrollFace(references.get(index))));
        }
        Phase1SFaceService.SFaceRecognitionResponse result = sFaceService.recognize(image, enrolled);
        Map<String, Object> response = new HashMap<>();
        response.put("faceCount", result.faceCount());
        response.put("matches", result.matches().stream().map(match -> {
            Map<String, Object> item = new HashMap<>();
            item.put("face_index", match.faceIndex());
            item.put("student_id", match.studentId());
            item.put("roll_number", match.rollNumber());
            item.put("matched", match.matched());
            item.put("confidence_score", match.confidenceScore());
            item.put("cosine_similarity", match.cosineSimilarity());
            item.put("recognition_state", match.recognitionState());
            return item;
        }).toList());
        response.put("quality", result.quality());
        return ResponseEntity.ok(response);
    }
}
