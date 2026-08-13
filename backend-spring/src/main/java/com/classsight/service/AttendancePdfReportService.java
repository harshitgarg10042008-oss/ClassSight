package com.classsight.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class AttendancePdfReportService {

    private final AttendanceAnalyticsService analyticsService;

    public AttendancePdfReportService(AttendanceAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    public byte[] generate(Map<String, Object> analytics) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, output);
            document.open();
            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
            document.add(new Paragraph("ClassSight Attendance Report", titleFont));
            document.add(new Paragraph("Subject ID: " + analytics.get("subjectId")
                    + " | Class Section ID: " + analytics.get("classSectionId")));
            document.add(new Paragraph("Date range: " + analytics.get("from") + " to " + analytics.get("to")));
            document.add(new Paragraph("Finalized sessions: " + analytics.get("finalizedSessionCount")
                    + " | Defaulter threshold: " + analytics.get("defaulterThreshold") + "%"));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            for (String heading : List.of("Student", "Roll", "Present", "Sessions", "Attendance %", "Defaulter")) {
                table.addCell(new Phrase(heading));
            }
            List<Map<String, Object>> defaulters = (List<Map<String, Object>>) analytics.get("defaulters");
            List<Map<String, Object>> students = (List<Map<String, Object>>) analytics.get("students");
            for (Map<String, Object> student : students) {
                table.addCell(String.valueOf(student.get("studentName")));
                table.addCell(String.valueOf(student.get("rollNumber")));
                table.addCell(String.valueOf(student.get("presentCount")));
                table.addCell(String.valueOf(student.get("sessionCount")));
                table.addCell(String.valueOf(student.get("attendancePercentage")));
                table.addCell(defaulters.contains(student) ? "YES" : "NO");
            }
            document.add(table);
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Defaulters"));
            if (defaulters.isEmpty()) {
                document.add(new Paragraph("None"));
            } else {
                for (Map<String, Object> defaulter : defaulters) {
                    document.add(new Paragraph(defaulter.get("studentName") + " ("
                            + defaulter.get("rollNumber") + "): "
                            + defaulter.get("attendancePercentage") + "%"));
                }
            }
            document.close();
            return output.toByteArray();
        } catch (DocumentException | IOException e) {
            throw new IllegalStateException("Could not generate attendance PDF", e);
        }
    }
}
