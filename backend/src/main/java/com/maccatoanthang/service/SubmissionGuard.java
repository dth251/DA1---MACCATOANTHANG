package com.maccatoanthang.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.maccatoanthang.dto.request.ClientRequestSubmit;
import com.maccatoanthang.dto.response.SubmissionResponse;
import com.maccatoanthang.exception.BadRequestException;
import com.maccatoanthang.exception.ConflictException;
import com.maccatoanthang.model.enums.RequestType;
import com.maccatoanthang.util.IdempotencyUtil;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;

@Component
@Transactional(propagation = Propagation.MANDATORY)
public class SubmissionGuard {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public SubmissionGuard(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper.copy().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
    }

    public record Reservation(String key, SubmissionResponse existing) { }

    public Reservation reserve(ClientRequestSubmit request, Long userId) {
        if (!IdempotencyUtil.isValid(request.idempotencyKey())) {
            throw new BadRequestException("Cần idempotencyKey do client tạo để gửi lại an toàn");
        }
        String key = hash((userId == null ? "guest" : "user:" + userId) + ":" + request.idempotencyKey());
        var payload = new LinkedHashMap<String, Object>();
        payload.put("type", request.type());
        payload.put("user", request.user());
        payload.put("items", request.items());
        payload.put("shipping", request.shipping());
        payload.put("payment", request.payment());
        payload.put("topic", request.topic());
        payload.put("message", request.message());
        payload.put("details", request.details());
        payload.put("expectedTotal", request.expectedTotal());
        String fingerprint;
        try { fingerprint = hash(mapper.writeValueAsString(payload)); }
        catch (JsonProcessingException ex) { throw new BadRequestException("Nội dung yêu cầu không hợp lệ"); }

        // ON CONFLICT waits for the other transaction. Rollback releases the reservation for retry.
        jdbc.update("insert into submission_key (id, fingerprint) values (?, ?) on conflict do nothing", key, fingerprint);
        return jdbc.queryForObject("select fingerprint, receipt_id, receipt_type, created_at from submission_key where id = ? for update",
                (rs, row) -> {
                    if (!fingerprint.equals(rs.getString("fingerprint"))) {
                        throw new ConflictException("Idempotency key đã được dùng cho nội dung khác");
                    }
                    String id = rs.getString("receipt_id");
                    return new Reservation(key, id == null ? null : new SubmissionResponse(id,
                            RequestType.valueOf(rs.getString("receipt_type")), rs.getTimestamp("created_at").toLocalDateTime()));
                }, key);
    }

    public void complete(String key, SubmissionResponse receipt) {
        jdbc.update("update submission_key set receipt_id = ?, receipt_type = ?, created_at = ? where id = ?",
                receipt.id(), receipt.type().name(), receipt.createdAt(), key);
    }

    public int cleanupOlderThan(java.time.LocalDateTime cutoff) {
        return jdbc.update("delete from submission_key where created_at < ?", cutoff);
    }

    private String hash(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
