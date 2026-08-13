package com.classsight.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.IOException;

@Service
public class ImageUploadValidator {
    public static final long MAX_BYTES = 15L * 1024L * 1024L;

    public void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("An image file is required");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Image exceeds the 15 MB upload limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(java.util.Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Upload must have an image content type");
        }
        try {
            if (ImageIO.read(file.getInputStream()) == null) {
                throw new IllegalArgumentException("Upload is not a decodable image");
            }
        } catch (IOException ex) {
            throw new IllegalArgumentException("Upload could not be read as an image");
        }
    }
}
