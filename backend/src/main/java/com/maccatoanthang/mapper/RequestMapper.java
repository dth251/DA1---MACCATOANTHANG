package com.maccatoanthang.mapper;

import com.maccatoanthang.dto.response.RequestResponse;
import com.maccatoanthang.model.Request;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RequestMapper {

    private final UserMapper userMapper;

    public RequestResponse toResponse(Request request) {
        if (request == null) {
            return null;
        }

        String statusLabel = switch (request.getStatus()) {
            case NEW -> "Chờ xử lý";
            case PROCESSING -> "Đang xử lý";
            case COMPLETED -> "Đã phản hồi";
            case REJECTED -> "Đã từ chối";
        };

        var userResp = userMapper.toResponse(request.getContact(), request.getUser());

        return RequestResponse.builder()
                .id(request.getId())
                .type(request.getType())
                .topic(request.getTopic())
                .status(request.getStatus())
                .statusLabel(statusLabel)
                .revision(request.getRevision())
                .user(userResp)
                .details(request.getDetails())
                .message(request.getMessage())
                .adminReply(request.getAdminReply())
                .repliedAt(request.getRepliedAt())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }
}
