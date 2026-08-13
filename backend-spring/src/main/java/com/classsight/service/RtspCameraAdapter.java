package com.classsight.service;

import com.classsight.entity.Camera;
import com.classsight.repository.CameraRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;

@Service
public class RtspCameraAdapter implements CameraFrameAdapter {
    private final CameraRepository cameraRepository;
    private final Path frameDirectory;

    public RtspCameraAdapter(CameraRepository cameraRepository,
                             @Value("${attendance.capture-storage-path:./data/captures}") String frameDirectory) {
        this.cameraRepository = cameraRepository;
        this.frameDirectory = Paths.get(frameDirectory).toAbsolutePath().normalize().resolve("camera-frames");
    }

    @Override
    public FrameResult captureFrame(Long cameraId) {
        Instant started = Instant.now();
        Camera camera = cameraRepository.findById(cameraId).orElse(null);
        if (camera == null) return failure("Camera not found", started);
        if (camera.getStreamUrl() == null || camera.getStreamUrl().isBlank()) return failure("Camera has no streamUrl", started);
        Path output = null;
        try {
            Files.createDirectories(frameDirectory);
            output = frameDirectory.resolve("camera-" + cameraId + "-" + System.currentTimeMillis() + ".jpg");
            Process process = new ProcessBuilder("ffmpeg", "-hide_banner", "-loglevel", "error",
                    "-rtsp_transport", "tcp", "-i", camera.getStreamUrl(), "-frames:v", "1", "-q:v", "2", "-y", output.toString())
                    .redirectErrorStream(true).start();
            boolean exited = process.waitFor(12, java.util.concurrent.TimeUnit.SECONDS);
            String message = new String(process.getInputStream().readAllBytes());
            if (!exited) {
                process.destroyForcibly();
                return failure("RTSP adapter timed out after 12 seconds", started);
            }
            if (process.exitValue() != 0 || !Files.exists(output) || Files.size(output) == 0) {
                return failure(message.isBlank() ? "RTSP adapter could not capture a frame" : message.trim(), started);
            }
            BufferedImage image = ImageIO.read(output.toFile());
            if (image == null) return failure("RTSP adapter output is not a decodable image", started);
            return new FrameResult(true, "RTSP adapter captured frame", elapsed(started), image.getWidth(), image.getHeight(), Files.size(output), output.toString());
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            return failure(ex.getMessage(), started);
        }
    }

    private FrameResult failure(String message, Instant started) { return new FrameResult(false, message, elapsed(started), 0, 0, 0L, null); }
    private long elapsed(Instant started) { return Duration.between(started, Instant.now()).toMillis(); }
}
