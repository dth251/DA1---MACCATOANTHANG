package com.maccatoanthang.security;

import com.maccatoanthang.exception.UnauthorizedException;
import com.maccatoanthang.model.AuthSession;
import com.maccatoanthang.repository.AuthSessionRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

@Component
public class JwtUtil {
    private final SecretKey key;
    private final long accessLifetime;
    private final long refreshLifetime;
    private final AuthSessionRepository sessions;

    public JwtUtil(@Value("${app.jwt.secret}") String secret,
                   @Value("${app.jwt.access-token-expiration-minutes:60}") long accessMinutes,
                   @Value("${app.jwt.refresh-token-expiration-days:7}") long refreshDays,
                   AuthSessionRepository sessions) {
        if (accessMinutes < 1 || refreshDays < 1) {
            throw new IllegalArgumentException("Token expiration must be positive");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessLifetime = Math.multiplyExact(accessMinutes, 60);
        this.refreshLifetime = Math.multiplyExact(refreshDays, 86400);
        this.sessions = sessions;
    }

    public record TokenPair(String accessToken, String refreshToken) { }
    public long expiresIn() { return accessLifetime; }
    public long refreshExpiresIn() { return refreshLifetime; }

    @Transactional
    public TokenPair issue(String subject, String role, Long userId) {
        AuthSession session = new AuthSession();
        session.setId(UUID.randomUUID().toString());
        session.setSubject(subject);
        session.setRole(role);
        session.setUserId(userId);
        session.setExpiresAt(Instant.now().plusSeconds(refreshLifetime));
        TokenPair pair = tokens(session);
        session.setRefreshHash(hash(pair.refreshToken()));
        sessions.saveAndFlush(session);
        return pair;
    }

    private TokenPair tokens(AuthSession session) {
        Instant accessExpiry = Instant.now().plusSeconds(accessLifetime);
        if (accessExpiry.isAfter(session.getExpiresAt())) {
            accessExpiry = session.getExpiresAt();
        }
        return new TokenPair(generate(session, "ACCESS", accessExpiry),
                generate(session, "REFRESH", session.getExpiresAt()));
    }

    private String generate(AuthSession session, String type, Instant expiry) {
        return Jwts.builder().issuer("macca-backend").id(UUID.randomUUID().toString())
                .subject(session.getSubject()).claim("role", session.getRole()).claim("type", type)
                .claim("sid", session.getId()).claim("userId", session.getUserId())
                .claim("customerId", session.getUserId()).issuedAt(new Date())
                .expiration(Date.from(expiry)).signWith(key).compact();
    }

    public Claims extractAllClaims(String token) {
        try {
            return Jwts.parser().verifyWith(key).requireIssuer("macca-backend").build()
                    .parseSignedClaims(token).getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            throw new UnauthorizedException("Token không hợp lệ hoặc đã hết hạn");
        }
    }

    public Claims validate(String token) {
        Claims claims = extractAllClaims(token);
        String sid = claims.get("sid", String.class);
        if (sid == null || claims.getId() == null || claims.getSubject() == null || claims.getExpiration() == null) {
            throw new UnauthorizedException("Phiên đăng nhập không hợp lệ");
        }
        AuthSession session = sessions.findById(sid)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không tồn tại"));
        checkSession(session);
        if (!session.getSubject().equals(claims.getSubject())
                || !session.getRole().equals(claims.get("role", String.class))
                || !java.util.Objects.equals(session.getUserId(), claims.get("userId", Long.class))) {
            throw new UnauthorizedException("Thông tin phiên không hợp lệ");
        }
        return claims;
    }

    private void checkSession(AuthSession session) {
        if (session.isRevoked() || !session.getExpiresAt().isAfter(Instant.now())) {
            throw new UnauthorizedException("Phiên đã hết hạn hoặc đã đăng xuất");
        }
    }

    public Claims validateAccessToken(String token) {
        Claims claims = validate(token);
        if (!"ACCESS".equals(claims.get("type", String.class))) {
            throw new UnauthorizedException("Không thể sử dụng Refresh Token để truy cập tài nguyên");
        }
        return claims;
    }

    public Claims validateRefreshToken(String token) {
        Claims claims = validate(token);
        if (!"REFRESH".equals(claims.get("type", String.class))) {
            throw new UnauthorizedException("Token không phải là Refresh Token hợp lệ");
        }
        return claims;
    }

    @Transactional(noRollbackFor = UnauthorizedException.class)
    public TokenPair rotate(String token) {
        // Lock before reading mutable session state; the winner rotates, a replay revokes the family.
        Claims claims = extractAllClaims(token);
        String sid = claims.get("sid", String.class);
        if (sid == null || !"REFRESH".equals(claims.get("type", String.class))) {
            throw new UnauthorizedException("Refresh Token không hợp lệ");
        }
        AuthSession session = sessions.findLocked(sid)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không tồn tại"));
        checkSession(session);
        if (!MessageDigest.isEqual(hash(token).getBytes(StandardCharsets.US_ASCII),
                session.getRefreshHash().getBytes(StandardCharsets.US_ASCII))) {
            session.setRevoked(true);
            sessions.flush();
            throw new UnauthorizedException("Refresh Token đã được sử dụng; vui lòng đăng nhập lại");
        }
        TokenPair pair = tokens(session);
        session.setRefreshHash(hash(pair.refreshToken()));
        sessions.flush();
        return pair;
    }

    @Transactional
    public void revoke(String token) {
        Claims claims = extractAllClaims(token);
        String sid = claims.get("sid", String.class);
        if (sid == null) { throw new UnauthorizedException("Phiên đăng nhập không hợp lệ"); }
        AuthSession session = sessions.findLocked(sid)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không tồn tại"));
        session.setRevoked(true);
        sessions.flush();
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    // Convenience helpers create persisted sessions, never untracked JWTs.
    @Transactional
    public String generateAdminToken(String username) { return issue(username, "ADMIN", null).accessToken(); }
    @Transactional
    public String generateAdminRefreshToken(String username) { return issue(username, "ADMIN", null).refreshToken(); }
    @Transactional
    public String generateUserToken(String phone, Long id) { return issue(phone, "USER", id).accessToken(); }
    @Transactional
    public String generateUserRefreshToken(String phone, Long id) { return issue(phone, "USER", id).refreshToken(); }
    @Transactional
    public String generateCustomerToken(String phone, Long id) { return generateUserToken(phone, id); }
    public String extractSubject(String token) { return extractAllClaims(token).getSubject(); }
    public String extractRole(String token) { return extractAllClaims(token).get("role", String.class); }
    public Long extractUserId(String token) { return extractAllClaims(token).get("userId", Long.class); }
    public Long extractCustomerId(String token) { return extractUserId(token); }
    public boolean isTokenValid(String token) {
        try { validate(token); return true; } catch (UnauthorizedException ex) { return false; }
    }
    public boolean validateJwtToken(String token, HttpServletRequest request) {
        try { validateAccessToken(token); return true; } catch (UnauthorizedException ex) {
            if (request != null) { request.setAttribute("jwt_error", ex.getMessage()); }
            return false;
        }
    }
}
