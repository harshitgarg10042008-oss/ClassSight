package com.classsight.service;

import com.classsight.entity.RefreshToken;
import com.classsight.entity.User;
import com.classsight.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class RefreshTokenService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final RefreshTokenRepository repository;
    private final int validityDays;

    public RefreshTokenService(
            RefreshTokenRepository repository,
            @Value("${jwt.refresh-validity-days:30}") int validityDays) {
        this.repository = repository;
        this.validityDays = validityDays;
    }

    @Transactional
    public String issue(User user) {
        repository.deleteByUserId(user.getId());
        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(hash(raw));
        token.setExpiresAt(LocalDateTime.now().plusDays(validityDays));
        repository.save(token);
        return raw;
    }

    @Transactional
    public User consume(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Refresh token is missing");
        }
        RefreshToken token = repository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("Refresh token is invalid"));
        if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Refresh token is expired or revoked");
        }
        token.setRevokedAt(LocalDateTime.now());
        return token.getUser();
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        repository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            token.setRevokedAt(LocalDateTime.now());
            repository.save(token);
        });
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                result.append(String.format("%02x", item));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
