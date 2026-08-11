package com.classsight.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
public class DatabaseHealthCheck implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseHealthCheck.class);

    private final DataSource dataSource;
    private final EntityManager entityManager;

    public DatabaseHealthCheck(DataSource dataSource, EntityManager entityManager) {
        this.dataSource = dataSource;
        this.entityManager = entityManager;
    }

    @Override
    public void run(String... args) throws Exception {
        logger.info("Verifying database connectivity...");
        
        try (Connection connection = dataSource.getConnection()) {
            String dbUrl = connection.getMetaData().getURL();
            String dbUser = connection.getMetaData().getUserName();
            String dbProduct = connection.getMetaData().getDatabaseProductName();
            String dbVersion = connection.getMetaData().getDatabaseProductVersion();
            
            logger.info("✓ Database connection successful!");
            logger.info("  - URL: {}", dbUrl);
            logger.info("  - User: {}", dbUser);
            logger.info("  - Product: {} {}", dbProduct, dbVersion);
            
            // Test a simple query
            entityManager.createNativeQuery("SELECT 1").getSingleResult();
            logger.info("✓ Database query test successful!");
            
        } catch (PersistenceException e) {
            logger.error("✗ Database query failed: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("✗ Database connection failed: {}", e.getMessage());
            throw e;
        }
    }
}
