package com.classsight.service;

import java.nio.file.Path;
import java.util.List;

public interface ErpProvider {
    ValidationResult validateMappings(List<Long> sessionIds);
    ExportResult submitAttendance(List<Long> sessionIds);
    SubmissionStatus getSubmissionStatus(Path exportPath);

    record ValidationResult(boolean valid, List<String> errors, int sessionCount, int rowCount) {}
    record ExportResult(boolean generated, String status, String message, Path path, int rowCount) {}
    record SubmissionStatus(boolean available, String status, String message, Path path, long sizeBytes) {}
}
