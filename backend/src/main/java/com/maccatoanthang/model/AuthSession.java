package com.maccatoanthang.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "auth_session")
@Getter
@Setter
public class AuthSession {
    @Id
    @Column(length = 36)
    private String id;
    @Column(nullable = false, length = 120)
    private String subject;
    @Column(nullable = false, length = 20)
    private String role;
    private Long userId;
    @Column(nullable = false, length = 64)
    private String refreshHash;
    @Column(nullable = false)
    private Instant expiresAt;
    @Column(nullable = false)
    private boolean revoked;
}
