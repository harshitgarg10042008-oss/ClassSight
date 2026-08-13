package com.classsight.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public class DiskMultipartFile implements MultipartFile {
    private final Path path;
    private final String contentType;

    public DiskMultipartFile(Path path, String contentType) { this.path = path; this.contentType = contentType; }
    @Override public String getName() { return path.getFileName().toString(); }
    @Override public String getOriginalFilename() { return path.getFileName().toString(); }
    @Override public String getContentType() { return contentType; }
    @Override public boolean isEmpty() { try { return Files.size(path) == 0; } catch (IOException e) { return true; } }
    @Override public long getSize() { try { return Files.size(path); } catch (IOException e) { return 0; } }
    @Override public byte[] getBytes() throws IOException { return Files.readAllBytes(path); }
    @Override public InputStream getInputStream() throws IOException { return Files.newInputStream(path); }
    @Override public void transferTo(Path destination) throws IOException { Files.copy(path, destination, java.nio.file.StandardCopyOption.REPLACE_EXISTING); }
    @Override public void transferTo(java.io.File destination) throws IOException { transferTo(destination.toPath()); }
}
