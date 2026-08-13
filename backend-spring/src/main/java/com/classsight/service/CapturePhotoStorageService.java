package com.classsight.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class CapturePhotoStorageService {

    private final Path rootDirectory;

    public CapturePhotoStorageService(
            @Value("${attendance.capture.storage-path:./data/captures}") String storagePath) {
        this.rootDirectory = Paths.get(storagePath).toAbsolutePath().normalize();
    }

    public String store(Long sessionId, MultipartFile image) throws IOException {
        Files.createDirectories(rootDirectory);
        String extension = extensionFor(image.getContentType(), image.getOriginalFilename());
        Path target = rootDirectory.resolve("session-" + sessionId + "-" + UUID.randomUUID() + extension).normalize();
        if (!target.startsWith(rootDirectory)) {
            throw new IOException("Invalid capture path");
        }
        Files.write(target, image.getBytes());
        return target.toString();
    }

    private String extensionFor(String contentType, String originalFilename) {
        if (contentType != null) {
            if (contentType.equalsIgnoreCase("image/png")) return ".png";
            if (contentType.equalsIgnoreCase("image/webp")) return ".webp";
        }
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0 && dot < originalFilename.length() - 1) {
                String extension = originalFilename.substring(dot).toLowerCase();
                if (extension.matches("\\.(jpg|jpeg|png|webp)")) return extension;
            }
        }
        return ".jpg";
    }
}
