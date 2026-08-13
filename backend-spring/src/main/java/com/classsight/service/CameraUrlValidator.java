package com.classsight.service;

import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;

@Service
public class CameraUrlValidator {
    public void validate(String streamUrl) {
        if (streamUrl == null || streamUrl.isBlank()) {
            return;
        }
        final URI uri;
        try {
            uri = new URI(streamUrl);
        } catch (URISyntaxException ex) {
            throw new IllegalArgumentException("Invalid camera stream URL");
        }
        if (!"rtsp".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            throw new IllegalArgumentException("Camera stream URL must use rtsp:// with a hostname");
        }
        String host = uri.getHost();
        String normalized = host.toLowerCase(java.util.Locale.ROOT);
        if (normalized.equals("localhost") || normalized.equals("metadata.google.internal")
                || normalized.equals("instance-data.ec2.internal") || normalized.equals("169.254.169.254")) {
            throw new IllegalArgumentException("Camera stream host is not allowed");
        }
        try {
            for (InetAddress address : InetAddress.getAllByName(host)) {
                if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress() || address.isMulticastAddress()
                        || address.getHostAddress().equals("169.254.169.254")) {
                    throw new IllegalArgumentException("Camera stream host resolves to a private or local address");
                }
            }
        } catch (java.io.IOException ex) {
            throw new IllegalArgumentException("Camera stream host could not be resolved");
        }
    }
}
