package com.classsight.controller;

import com.classsight.repository.RecognitionJobRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.HashMap;
import java.util.Objects;

@RestController
@RequestMapping("/api/recognition-jobs")
public class RecognitionJobController {
    private final RecognitionJobRepository jobRepository;

    public RecognitionJobController(RecognitionJobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        return jobRepository.findById(Objects.requireNonNull(id, "id"))
                .map(job -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("jobId", job.getId());
                    result.put("sessionId", job.getSession().getId());
                    result.put("status", job.getStatus().name());
                    result.put("errorMessage", job.getErrorMessage() == null ? "" : job.getErrorMessage());
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}