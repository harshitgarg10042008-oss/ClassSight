package com.classsight.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/** Backend-neutral storage boundary for captured attendance photos. */
public interface StorageService {
    String store(Long sessionId, MultipartFile image) throws IOException;

    StoredObject read(String objectKey) throws IOException;

    boolean exists(String objectKey) throws IOException;

    void delete(String objectKey) throws IOException;

    record StoredObject(byte[] bytes, String contentType) {}
}

