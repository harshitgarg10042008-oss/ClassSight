package com.classsight.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketAlreadyExistsException;
import software.amazon.awssdk.services.s3.model.BucketAlreadyOwnedByYouException;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.URI;
import java.util.Locale;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "attendance.capture.backend", havingValue = "minio")
public class MinioStorageService implements StorageService {
    private final S3Client client;
    private final String bucket;

    public MinioStorageService(
            @Value("${attendance.capture.minio.endpoint:http://localhost:9000}") String endpoint,
            @Value("${attendance.capture.minio.access-key:minioadmin}") String accessKey,
            @Value("${attendance.capture.minio.secret-key:minioadmin}") String secretKey,
            @Value("${attendance.capture.minio.region:us-east-1}") String region,
            @Value("${attendance.capture.minio.bucket:classsight-captures}") String bucket) {
        this.bucket = bucket;
        this.client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .forcePathStyle(true)
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    @PostConstruct
    public void ensureBucket() {
        try {
            client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
        } catch (BucketAlreadyExistsException | BucketAlreadyOwnedByYouException ignored) {
            // Idempotent startup: another instance or the init container already created it.
        }
    }

    @Override
    public String store(Long sessionId, MultipartFile image) throws IOException {
        String extension = extensionFor(image.getContentType(), image.getOriginalFilename());
        String key = "captures/session-" + sessionId + "-" + UUID.randomUUID() + extension;
        try {
            client.putObject(PutObjectRequest.builder()
                            .bucket(bucket).key(key)
                            .contentType(image.getContentType() == null ? "image/jpeg" : image.getContentType())
                            .build(), RequestBody.fromBytes(image.getBytes()));
            return key;
        } catch (RuntimeException ex) {
            throw new IOException("Could not store capture in MinIO", ex);
        }
    }

    @Override
    public StoredObject read(String objectKey) throws IOException {
        try {
            ResponseBytes<GetObjectResponse> response = client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(bucket).key(objectKey).build());
            return new StoredObject(response.asByteArray(), response.response().contentType());
        } catch (S3Exception ex) {
            throw new IOException("Captured photo is missing in MinIO", ex);
        }
    }

    @Override
    public boolean exists(String objectKey) throws IOException {
        try {
            client.headObject(HeadObjectRequest.builder().bucket(bucket).key(objectKey).build());
            return true;
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) return false;
            throw new IOException("Could not inspect MinIO object", ex);
        }
    }

    @Override
    public void delete(String objectKey) throws IOException {
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(objectKey).build());
        } catch (S3Exception ex) {
            throw new IOException("Could not delete MinIO object", ex);
        }
    }

    private String extensionFor(String contentType, String originalFilename) {
        if (contentType != null) {
            String normalized = contentType.toLowerCase(Locale.ROOT);
            if (normalized.equals("image/png")) return ".png";
            if (normalized.equals("image/webp")) return ".webp";
        }
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0 && dot < originalFilename.length() - 1) {
                String extension = originalFilename.substring(dot).toLowerCase(Locale.ROOT);
                if (extension.matches("\\.(jpg|jpeg|png|webp)")) return extension;
            }
        }
        return ".jpg";
    }
}

