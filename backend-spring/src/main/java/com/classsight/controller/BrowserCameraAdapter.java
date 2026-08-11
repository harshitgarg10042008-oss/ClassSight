package com.classsight.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/capture")
@CrossOrigin(origins = "*") // Allow CORS for testing from file:// or local server
public class BrowserCameraAdapter {

    private static final Logger logger = LoggerFactory.getLogger(BrowserCameraAdapter.class);

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> uploadCaptureMultipart(@RequestParam("image") MultipartFile image) {
        logger.info("Received capture via multipart. Size: {} bytes, ContentType: {}", 
                image.getSize(), image.getContentType());
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Image received via multipart successfully");
        response.put("size", image.getSize());
        response.put("contentType", image.getContentType());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping(consumes = "application/json")
    public ResponseEntity<Map<String, Object>> uploadCaptureBase64(@RequestBody Map<String, String> payload) {
        String base64Image = payload.get("image");
        if (base64Image == null || base64Image.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing image data"));
        }
        
        logger.info("Received capture via base64 JSON. Length: {} chars", base64Image.length());
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Image received via base64 successfully");
        response.put("length", base64Image.length());
        
        return ResponseEntity.ok(response);
    }
}
