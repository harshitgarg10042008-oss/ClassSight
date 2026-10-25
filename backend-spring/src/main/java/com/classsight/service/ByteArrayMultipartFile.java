package com.classsight.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.IOException;

public final class ByteArrayMultipartFile implements MultipartFile {
    private final String name; private final String filename; private final String contentType; private final byte[] bytes;
    public ByteArrayMultipartFile(String name, String filename, String contentType, byte[] bytes) { this.name=name; this.filename=filename; this.contentType=contentType; this.bytes=bytes.clone(); }
    @Override public String getName(){return name;}
    @Override public String getOriginalFilename(){return filename;}
    @Override public String getContentType(){return contentType;}
    @Override public boolean isEmpty(){return bytes.length==0;}
    @Override public long getSize(){return bytes.length;}
    @Override public byte[] getBytes(){return bytes.clone();}
    @Override public InputStream getInputStream(){return new ByteArrayInputStream(bytes);}
    @Override public void transferTo(java.io.File destination) throws IOException { java.nio.file.Files.write(destination.toPath(),bytes); }
    @Override public void transferTo(java.nio.file.Path destination) throws IOException { java.nio.file.Files.write(destination,bytes); }
}
