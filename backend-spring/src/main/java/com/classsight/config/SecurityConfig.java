package com.classsight.config;

import com.classsight.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/auth/**",
                    "/api/**", "/capture", "/capture/**",
                    "/students/**", "/student/**", "/admin/**", "/teacher/**"))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/health", "/actuator/**", "/csrf", "/auth/login", "/auth/logout", "/login", "/*.html", "/css/**", "/js/**", "/images/**").permitAll()
                .requestMatchers("/auth/me", "/auth/change-password").authenticated()
                .requestMatchers("/admin/**").hasAnyRole("ADMIN", "HOD")
                .requestMatchers("/teacher/**").hasAnyRole("ADMIN", "HOD", "TEACHER")
                .requestMatchers("/student/**").hasAnyRole("ADMIN", "HOD", "TEACHER", "STUDENT")
                .requestMatchers("/students/**", "/capture/**", "/capture").hasAnyRole("ADMIN", "HOD", "TEACHER")
                .requestMatchers("/api/attendance-sessions/**").hasAnyRole("ADMIN", "HOD", "TEACHER")
                .requestMatchers("/api/analytics/**").hasAnyRole("ADMIN", "HOD", "TEACHER")
                .requestMatchers("/api/disputes/**").hasAnyRole("ADMIN", "HOD", "TEACHER")
                .requestMatchers("/api/student-leaves/**").hasAnyRole("ADMIN", "HOD", "TEACHER")
                .requestMatchers("/api/students/*/biometrics").hasAnyRole("ADMIN", "HOD")
                .requestMatchers("/api/timetable/current-period", "/api/timetable/today").hasAnyRole("ADMIN", "HOD", "TEACHER")
                .requestMatchers("/api/timetable/**").hasAnyRole("ADMIN", "HOD")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.setAllowedOriginPatterns(java.util.List.of("http://localhost:*", "http://127.0.0.1:*"));
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(java.util.List.of("*"));
        configuration.setExposedHeaders(java.util.List.of("X-XSRF-TOKEN", "Authorization"));
        configuration.setAllowCredentials(true);
        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public org.springframework.web.client.RestTemplate restTemplate() {
        return new org.springframework.web.client.RestTemplate();
    }
}
