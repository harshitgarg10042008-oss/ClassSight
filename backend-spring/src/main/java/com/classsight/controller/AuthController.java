package com.classsight.controller;

import com.classsight.dto.LoginRequest;
import com.classsight.dto.LoginResponse;
import com.classsight.dto.UserResponse;
import com.classsight.entity.User;
import com.classsight.repository.UserRepository;
import com.classsight.security.JwtUtil;
import com.classsight.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@SuppressWarnings("null")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsernameOrEmail(),
                            loginRequest.getPassword()
                    )
            );

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String token = jwtUtil.generateToken(userDetails);

            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseGet(() -> userRepository.findByEmail(userDetails.getUsername())
                            .orElseThrow(() -> new RuntimeException("User not found")));

            String refreshToken = refreshTokenService.issue(user);
            addCookie(response, "refresh_token", refreshToken, 30 * 24 * 60 * 60);
            addCookie(response, "jwt", token, 15 * 60);

            LoginResponse loginResponse = new LoginResponse(
                    token,
                    user.getId(),
                    user.getUsername(),
                    user.getFullName(),
                    user.getEmail(),
                    user.getRole().name()
            );

            return ResponseEntity.ok(loginResponse);
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        try {
            User user = refreshTokenService.consume(refreshToken);
            UserDetails details = new org.springframework.security.core.userdetails.User(
                    user.getUsername(), user.getPassword(), user.getEnabled(),
                    true, true, true, java.util.List.of());
            String accessToken = jwtUtil.generateToken(details);
            String rotatedRefreshToken = refreshTokenService.issue(user);
            addCookie(response, "refresh_token", rotatedRefreshToken, 30 * 24 * 60 * 60);
            addCookie(response, "jwt", accessToken, 15 * 60);
            return ResponseEntity.ok(new LoginResponse(
                    accessToken, user.getId(), user.getUsername(), user.getFullName(),
                    user.getEmail(), user.getRole().name()));
        } catch (IllegalArgumentException exception) {
            clearCookie(response, "refresh_token");
            return ResponseEntity.status(401).body("Invalid or expired refresh token");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        refreshTokenService.revoke(refreshToken);
        clearCookie(response, "refresh_token");
        clearCookie(response, "jwt");
        return ResponseEntity.ok("Logged out");
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        response.addHeader("Set-Cookie", String.format(
                "%s=%s; Max-Age=%d; Path=/; HttpOnly; SameSite=Lax",
                name, value, maxAge));
    }

    private void clearCookie(HttpServletResponse response, String name) {
        response.addHeader("Set-Cookie", name + "=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseGet(() -> userRepository.findByEmail(userDetails.getUsername())
                        .orElseThrow(() -> new RuntimeException("User not found")));

        return ResponseEntity.ok(new UserResponse(user));
    }
}
