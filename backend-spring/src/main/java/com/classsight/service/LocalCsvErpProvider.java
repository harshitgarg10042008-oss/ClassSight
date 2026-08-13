package com.classsight.service;

import com.classsight.entity.AttendanceRecord;
import com.classsight.entity.AttendanceSession;
import com.classsight.repository.AttendanceSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class LocalCsvErpProvider implements ErpProvider {
    private static final DateTimeFormatter FILE_TIME = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");
    private static final String HEADER = "student_id,student_name,subject,date,status\n";

    private final AttendanceSessionRepository sessionRepository;
    private final Path exportDirectory;

    public LocalCsvErpProvider(AttendanceSessionRepository sessionRepository,
                               @Value("${classsight.erp.export-dir:exports}") String exportDirectory) {
        this.sessionRepository = sessionRepository;
        this.exportDirectory = Paths.get(exportDirectory).toAbsolutePath().normalize();
    }

    @Override
    public ValidationResult validateMappings(List<Long> sessionIds) {
        List<AttendanceSession> sessions = loadSessions(sessionIds);
        List<String> errors = new ArrayList<>();
        Set<Long> found = sessions.stream().map(AttendanceSession::getId).collect(Collectors.toSet());
        for (Long id : sessionIds) {
            if (!found.contains(id)) {
                errors.add("Session " + id + " was not found");
            }
        }
        int rows = 0;
        for (AttendanceSession session : sessions) {
            List<AttendanceRecord> records = sortedRecords(session);
            if (session.getStatus() != AttendanceSession.SessionStatus.FINALIZED) {
                errors.add("Session " + session.getId() + " is " + session.getStatus() + "; only FINALIZED sessions can be exported");
            }
            if (session.getSubject() == null || isBlank(session.getSubject().getName())) {
                errors.add("Session " + session.getId() + " has no subject");
            }
            if (sessionDate(session) == null) {
                errors.add("Session " + session.getId() + " has no valid attendance date");
            }
            for (AttendanceRecord record : records) {
                rows++;
                if (record.getStudent() == null || record.getStudent().getId() == null) {
                    errors.add("Session " + session.getId() + " has a record without student_id");
                }
                if (record.getStatus() != AttendanceRecord.AttendanceStatus.PRESENT
                        && record.getStatus() != AttendanceRecord.AttendanceStatus.ABSENT) {
                    errors.add("Session " + session.getId() + " record " + record.getId() + " has invalid export status " + record.getStatus());
                }
            }
        }
        return new ValidationResult(errors.isEmpty(), errors, sessions.size(), rows);
    }

    @Override
    @Transactional
    public ExportResult submitAttendance(List<Long> sessionIds) {
        ValidationResult validation = validateMappings(sessionIds);
        if (!validation.valid()) {
            return new ExportResult(false, "VALIDATION_FAILED", String.join("; ", validation.errors()), null, 0);
        }
        List<AttendanceSession> sessions = loadSessions(sessionIds);
        try {
            Files.createDirectories(exportDirectory);
            String filename = "attendance-" + java.time.LocalDateTime.now().format(FILE_TIME) + ".csv";
            Path output = exportDirectory.resolve(filename);
            if (Files.exists(output)) {
                output = exportDirectory.resolve("attendance-" + java.time.LocalDateTime.now().format(FILE_TIME) + "-" + System.nanoTime() + ".csv");
            }
            StringBuilder csv = new StringBuilder(HEADER);
            int rows = 0;
            for (AttendanceSession session : sessions.stream().sorted(Comparator.comparing(AttendanceSession::getId)).toList()) {
                String subject = session.getSubject().getName();
                LocalDate date = sessionDate(session);
                for (AttendanceRecord record : sortedRecords(session)) {
                    csv.append(record.getStudent().getId()).append(',')
                            .append(csvValue(record.getStudent().getFirstName() + " " + record.getStudent().getLastName())).append(',')
                            .append(csvValue(subject)).append(',')
                            .append(date).append(',')
                            .append(record.getStatus()).append('\n');
                    rows++;
                }
            }
            Files.writeString(output, csv.toString(), StandardCharsets.UTF_8);
            return new ExportResult(true, "GENERATED_LOCAL_ONLY", "CSV generated locally; no ERP delivery was attempted", output, rows);
        } catch (IOException ex) {
            return new ExportResult(false, "GENERATION_FAILED", ex.getMessage(), null, 0);
        }
    }

    @Override
    public SubmissionStatus getSubmissionStatus(Path exportPath) {
        if (exportPath == null) {
            return new SubmissionStatus(false, "NOT_GENERATED", "No local export path was supplied", null, 0);
        }
        try {
            if (!Files.exists(exportPath) || !Files.isRegularFile(exportPath)) {
                return new SubmissionStatus(false, "NOT_AVAILABLE", "Local export file is not available", exportPath, 0);
            }
            return new SubmissionStatus(true, "GENERATED_LOCAL_ONLY", "File exists locally; no ERP delivery was attempted", exportPath, Files.size(exportPath));
        } catch (IOException ex) {
            return new SubmissionStatus(false, "STATUS_CHECK_FAILED", ex.getMessage(), exportPath, 0);
        }
    }

    public Path exportDirectory() {
        return exportDirectory;
    }

    private List<AttendanceSession> loadSessions(List<Long> sessionIds) {
        return sessionRepository.findAllById(sessionIds);
    }

    private List<AttendanceRecord> sortedRecords(AttendanceSession session) {
        return session.getAttendanceRecords().stream()
                .sorted(Comparator.comparing(record -> record.getStudent().getId()))
                .toList();
    }

    private LocalDate sessionDate(AttendanceSession session) {
        if (session.getStartedAt() != null) return session.getStartedAt().toLocalDate();
        if (session.getCreatedAt() != null) return session.getCreatedAt().toLocalDate();
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String csvValue(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
