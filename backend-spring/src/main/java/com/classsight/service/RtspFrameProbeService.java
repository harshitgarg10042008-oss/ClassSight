package com.classsight.service;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;

@Service
public class RtspFrameProbeService {
    public ProbeResult probe(String streamUrl) {
        if (streamUrl == null || streamUrl.isBlank()) {
            return new ProbeResult(false, "No streamUrl configured", 0, 0, 0, null);
        }
        Path frame = null;
        Instant started = Instant.now();
        try {
            frame = Files.createTempFile("classsight-camera-", ".jpg");
            Process process = new ProcessBuilder("ffmpeg", "-hide_banner", "-loglevel", "error",
                    "-rtsp_transport", "tcp", "-i", streamUrl, "-frames:v", "1", "-q:v", "2", "-y", frame.toString())
                    .redirectErrorStream(true).start();
            boolean exited = process.waitFor(12, java.util.concurrent.TimeUnit.SECONDS);
            if (!exited) {
                process.destroyForcibly();
                return new ProbeResult(false, "RTSP probe timed out after 12 seconds", elapsed(started), 0, 0, null);
            }
            String output = new String(process.getInputStream().readAllBytes());
            if (process.exitValue() != 0 || !Files.exists(frame) || Files.size(frame) == 0) {
                return new ProbeResult(false, output.isBlank() ? "FFmpeg could not capture a frame" : output.trim(), elapsed(started), 0, 0, null);
            }
            BufferedImage image = ImageIO.read(frame.toFile());
            if (image == null) return new ProbeResult(false, "Captured file was not a decodable image", elapsed(started), 0, 0, null);
            return new ProbeResult(true, "RTSP frame captured", elapsed(started), image.getWidth(), image.getHeight(), Files.size(frame));
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            return new ProbeResult(false, ex.getMessage(), elapsed(started), 0, 0, null);
        } finally {
            if (frame != null) try { Files.deleteIfExists(frame); } catch (IOException ignored) { }
        }
    }

    private long elapsed(Instant started) { return Duration.between(started, Instant.now()).toMillis(); }
    public record ProbeResult(boolean success, String message, long latencyMs, int width, int height, Long bytes) {}
}
