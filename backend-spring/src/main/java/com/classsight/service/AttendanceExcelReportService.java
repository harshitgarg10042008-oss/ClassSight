package com.classsight.service;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class AttendanceExcelReportService {

    public byte[] generate(Map<String, Object> analytics) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            // 1. [Content_Types].xml
            addZipEntry(zos, "[Content_Types].xml",
                    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
                    "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">\n" +
                    "  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>\n" +
                    "  <Default Extension=\"xml\" ContentType=\"application/xml\"/>\n" +
                    "  <Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>\n" +
                    "  <Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>\n" +
                    "</Types>");

            // 2. _rels/.rels
            addZipEntry(zos, "_rels/.rels",
                    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
                    "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\n" +
                    "  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>\n" +
                    "</Relationships>");

            // 3. xl/workbook.xml
            addZipEntry(zos, "xl/workbook.xml",
                    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
                    "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">\n" +
                    "  <sheets>\n" +
                    "    <sheet name=\"Attendance Report\" sheetId=\"1\" r:id=\"rId1\"/>\n" +
                    "  </sheets>\n" +
                    "</workbook>");

            // 4. xl/_rels/workbook.xml.rels
            addZipEntry(zos, "xl/_rels/workbook.xml.rels",
                    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
                    "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\n" +
                    "  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>\n" +
                    "</Relationships>");

            // 5. xl/worksheets/sheet1.xml
            String sheetXml = buildSheetXml(analytics);
            addZipEntry(zos, "xl/worksheets/sheet1.xml", sheetXml);

            zos.finish();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate Excel report", e);
        }
    }

    @SuppressWarnings("unchecked")
    private String buildSheetXml(Map<String, Object> analytics) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
        sb.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n");
        sb.append("  <sheetData>\n");

        int rowNum = 1;
        // Title
        sb.append(row(rowNum++, cell("A", "ClassSight Attendance Report", true)));
        // Metadata
        sb.append(row(rowNum++, cell("A", "Subject ID: " + analytics.get("subjectId") + " | Class Section ID: " + analytics.get("classSectionId"), true)));
        sb.append(row(rowNum++, cell("A", "Date Range: " + analytics.get("from") + " to " + analytics.get("to") + " | Defaulter Threshold: " + analytics.get("defaulterThreshold") + "%", true)));
        sb.append(row(rowNum++)); // blank row

        // Headers
        sb.append(row(rowNum++,
                cell("A", "Student Name", true),
                cell("B", "Roll Number", true),
                cell("C", "Present Count", true),
                cell("D", "Session Count", true),
                cell("E", "Attendance %", true),
                cell("F", "Defaulter (<" + analytics.get("defaulterThreshold") + "%)", true)
        ));

        List<Map<String, Object>> students = (List<Map<String, Object>>) analytics.get("students");
        List<Map<String, Object>> defaulters = (List<Map<String, Object>>) analytics.get("defaulters");

        if (students != null) {
            for (Map<String, Object> s : students) {
                boolean isDefaulter = defaulters != null && defaulters.contains(s);
                sb.append(row(rowNum++,
                        cell("A", String.valueOf(s.get("studentName")), true),
                        cell("B", String.valueOf(s.get("rollNumber")), true),
                        cell("C", String.valueOf(s.get("presentCount")), false),
                        cell("D", String.valueOf(s.get("sessionCount")), false),
                        cell("E", String.valueOf(s.get("attendancePercentage")), false),
                        cell("F", isDefaulter ? "YES" : "NO", true)
                ));
            }
        }

        // Summary of defaulters
        sb.append(row(rowNum++));
        sb.append(row(rowNum++, cell("A", "Defaulters Summary", true)));
        if (defaulters == null || defaulters.isEmpty()) {
            sb.append(row(rowNum++, cell("A", "No defaulters in this period", true)));
        } else {
            for (Map<String, Object> d : defaulters) {
                sb.append(row(rowNum++, cell("A", d.get("studentName") + " (" + d.get("rollNumber") + "): " + d.get("attendancePercentage") + "%", true)));
            }
        }

        sb.append("  </sheetData>\n");
        sb.append("</worksheet>");
        return sb.toString();
    }

    private String row(int r, String... cells) {
        StringBuilder b = new StringBuilder();
        b.append("    <row r=\"").append(r).append("\">\n");
        for (String c : cells) {
            b.append("      ").append(c).append("\n");
        }
        b.append("    </row>\n");
        return b.toString();
    }

    private String cell(String col, String val, boolean isString) {
        String escaped = val == null ? "" : val.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
        if (isString) {
            return "<c t=\"inlineStr\"><is><t>" + escaped + "</t></is></c>";
        } else {
            return "<c><v>" + escaped + "</v></c>";
        }
    }

    private void addZipEntry(ZipOutputStream zos, String path, String content) throws IOException {
        ZipEntry entry = new ZipEntry(path);
        zos.putNextEntry(entry);
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        zos.write(bytes, 0, bytes.length);
        zos.closeEntry();
    }
}
