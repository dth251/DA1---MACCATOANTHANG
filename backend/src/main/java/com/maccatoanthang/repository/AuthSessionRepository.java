package com.maccatoanthang.repository;

import com.maccatoanthang.model.AuthSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from AuthSession s where s.id = :id")
    Optional<AuthSession> findLocked(@Param("id") String id);

    @Modifying
    @Query("delete from AuthSession s where s.expiresAt < :cutoff")
    int deleteExpiredSessions(@Param("cutoff") Instant cutoff);
}
