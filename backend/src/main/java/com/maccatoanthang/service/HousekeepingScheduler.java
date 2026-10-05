package com.maccatoanthang.service;

import com.maccatoanthang.repository.AuthSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class HousekeepingScheduler {

    private final AuthSessionRepository authSessionRepository;
    private final SubmissionGuard submissionGuard;

    /**
     * Định kỳ dọn dẹp các session đã hết hạn và các khóa idempotency cũ.
     * Mặc định chạy hàng ngày lúc 03:00 sáng.
     */
    @Scheduled(cron = "${app.housekeeping.cron:0 0 3 * * *}")
    @Transactional
    public void cleanup() {
        Instant sessionCutoff = Instant.now();
        int cleanedSessions = authSessionRepository.deleteExpiredSessions(sessionCutoff);

        // Khóa idempotency giữ trong 7 ngày
        LocalDateTime submissionCutoff = LocalDateTime.now().minusDays(7);
        int cleanedKeys = submissionGuard.cleanupOlderThan(submissionCutoff);

        if (cleanedSessions > 0 || cleanedKeys > 0) {
            log.info("Dọn dẹp hệ thống hoàn tất: đã xóa {} phiên đăng nhập hết hạn và {} khóa idempotency cũ",
                    cleanedSessions, cleanedKeys);
        }
    }
}
