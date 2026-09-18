package com.classsight.service;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.lang.NonNull;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;

public class DiskMultipartFile implements MultipartFile {
    private final Path path;
    private final String contentType;

    public DiskMultipartFile(Path path, String contentType) {
        this.path = path;
        this.contentType = contentType;
    }

    @Override
    @NonNull
    public String getName() {
        Path fileName = Objects.requireNonNull(path.getFileName());
        return Objects.requireNonNull(fileName.toString());
    }

    @Override
    public String getOriginalFilename() {
        return path.getFileName().toString();
    }

    @Override
    public String getContentType() {
        return contentType;
    }

    @Override
    public boolean isEmpty() {
        try {
            return Files.size(path) == 0;
        } catch (IOException e) {
            return true;
        }
    }

    @Override
    public long getSize() {
        try {
            return Files.size(path);
        } catch (IOException e) {
            return 0;
        }
    }

    @Override
    @NonNull
    public byte[] getBytes() throws IOException {
        return Objects.requireNonNull(Files.readAllBytes(path));
    }

    @Override
    @NonNull
    public InputStream getInputStream() throws IOException {
        return Objects.requireNonNull(Files.newInputStream(path));
    }

    @Override
    public void transferTo(@NonNull Path destination) throws IOException {
        Files.copy(path, destination, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public void transferTo(@NonNull java.io.File destination) throws IOException {
        transferTo(Objects.requireNonNull(Objects.requireNonNull(destination).toPath()));
    }
}
