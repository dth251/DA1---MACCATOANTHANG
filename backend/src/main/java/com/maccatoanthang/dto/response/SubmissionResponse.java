package com.maccatoanthang.dto.response;

import com.maccatoanthang.model.enums.RequestType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Minimal public receipt: never exposes existing customer details or admin replies.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionResponse {

    private String id;

    private RequestType type;

    private LocalDateTime createdAt;

    public String id() {
        return this.id;
    }

    public RequestType type() {
        return this.type;
    }

    public LocalDateTime createdAt() {
        return this.createdAt;
    }
}
