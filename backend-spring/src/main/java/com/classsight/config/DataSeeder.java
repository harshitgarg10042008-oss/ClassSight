package com.classsight.config;

import com.classsight.entity.User;
import com.classsight.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedAdminUser();
        seedTeacherUser();
    }

    private void seedAdminUser() {
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setFullName("Admin User");
            admin.setEmail("admin@classsight.com");
            admin.setRole(User.Role.ADMIN);
            admin.setEnabled(true);
            
            userRepository.save(admin);
            logger.info("✓ Admin user created: username=admin, password=admin123");
        } else {
            logger.info("Admin user already exists");
        }
    }

    private void seedTeacherUser() {
        if (!userRepository.existsByUsername("teacher")) {
            User teacher = new User();
            teacher.setUsername("teacher");
            teacher.setPassword(passwordEncoder.encode("teacher123"));
            teacher.setFullName("Teacher User");
            teacher.setEmail("teacher@classsight.com");
            teacher.setRole(User.Role.TEACHER);
            teacher.setEnabled(true);
            
            userRepository.save(teacher);
            logger.info("✓ Teacher user created: username=teacher, password=teacher123");
        } else {
            logger.info("Teacher user already exists");
        }
    }
}
