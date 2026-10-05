package com.maccatoanthang.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;

@Component
public class CredentialValidation {
    @Value("${app.admin.password}")
    private String adminPassword;
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @PostConstruct
    void validate() {
        if (adminPassword.length() < 12 || adminPassword.equals("admin_password_123456")
                || adminPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalStateException("ADMIN_PASSWORD phải từ 12 ký tự đến 72 byte và không dùng giá trị mặc định cũ");
        }
        if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32
                || jwtSecret.equals("your-256-bit-secret-key-change-in-production")) {
            throw new IllegalStateException("JWT_SECRET cần ít nhất 32 byte và không dùng giá trị mặc định cũ");
        }
    }
}
