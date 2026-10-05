package com.maccatoanthang.dto.response;

import com.maccatoanthang.model.enums.RequestStatus;
import com.maccatoanthang.model.enums.RequestType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestResponse {

    private String id;

    private RequestType type;

    private String topic;

    private RequestStatus status;

    private String statusLabel;

    private Integer revision;

    private UserResponse user;

    private Map<String, Object> details;

    private String message;

    private String adminReply;

    private LocalDateTime repliedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public String id() {
        return this.id;
    }

    public RequestType type() {
        return this.type;
    }

    public String topic() {
        return this.topic;
    }

    public RequestStatus status() {
        return this.status;
    }

    public String statusLabel() {
        return this.statusLabel;
    }

    public Integer revision() {
        return this.revision;
    }

    public UserResponse customer() {
        return this.user;
    }

    public UserResponse user() {
        return this.user;
    }

    public Map<String, Object> details() {
        return this.details;
    }

    public String message() {
        return this.message;
    }

    public String adminReply() {
        return this.adminReply;
    }

    public LocalDateTime repliedAt() {
        return this.repliedAt;
    }

    public LocalDateTime createdAt() {
        return this.createdAt;
    }

    public LocalDateTime updatedAt() {
        return this.updatedAt;
    }
}
