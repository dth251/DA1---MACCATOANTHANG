package com.maccatoanthang.service;

import com.maccatoanthang.model.AuthSession;
import com.maccatoanthang.repository.AuthSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
class HousekeepingSchedulerTest {

    @Autowired
    private HousekeepingScheduler housekeepingScheduler;

    @Autowired
    private AuthSessionRepository authSessionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @Transactional
    void cleanupRemovesExpiredSessionsAndOldSubmissionKeys() {
        // 1. Session đã hết hạn
        AuthSession expiredSession = new AuthSession();
        expiredSession.setId(UUID.randomUUID().toString());
        expiredSession.setSubject("0900999991");
        expiredSession.setRole("USER");
        expiredSession.setRefreshHash("hash1");
        expiredSession.setExpiresAt(Instant.now().minusSeconds(3600)); // Hết hạn 1 giờ trước
        expiredSession.setRevoked(false);
        authSessionRepository.saveAndFlush(expiredSession);

        // 2. Session còn hạn
        AuthSession activeSession = new AuthSession();
        activeSession.setId(UUID.randomUUID().toString());
        activeSession.setSubject("0900999992");
        activeSession.setRole("USER");
        activeSession.setRefreshHash("hash2");
        activeSession.setExpiresAt(Instant.now().plusSeconds(86400)); // Còn hạn 1 ngày
        activeSession.setRevoked(false);
        authSessionRepository.saveAndFlush(activeSession);

        // 3. Submission key cũ hơn 8 ngày
        String oldKey = "old-sub-key-" + UUID.randomUUID();
        jdbcTemplate.update("insert into submission_key(id, fingerprint, receipt_id, receipt_type, created_at) values (?, ?, ?, ?, ?)",
                oldKey, "fingerprint-old", "rec-old", "ORDER", LocalDateTime.now().minusDays(8));

        // 4. Submission key mới (1 ngày trước)
        String recentKey = "recent-sub-key-" + UUID.randomUUID();
        jdbcTemplate.update("insert into submission_key(id, fingerprint, receipt_id, receipt_type, created_at) values (?, ?, ?, ?, ?)",
                recentKey, "fingerprint-recent", "rec-recent", "ORDER", LocalDateTime.now().minusDays(1));

        // Thực thi cleanup
        housekeepingScheduler.cleanup();

        // Kiểm tra session hết hạn bị xóa, session còn hạn giữ nguyên
        assertEquals(0, jdbcTemplate.queryForObject("select count(*) from auth_session where id = ?", Integer.class, expiredSession.getId()));
        assertEquals(1, jdbcTemplate.queryForObject("select count(*) from auth_session where id = ?", Integer.class, activeSession.getId()));

        // Kiểm tra key cũ hơn 7 ngày bị xóa, key mới giữ nguyên
        assertEquals(0, jdbcTemplate.queryForObject("select count(*) from submission_key where id = ?", Integer.class, oldKey));
        assertEquals(1, jdbcTemplate.queryForObject("select count(*) from submission_key where id = ?", Integer.class, recentKey));
    }
}
