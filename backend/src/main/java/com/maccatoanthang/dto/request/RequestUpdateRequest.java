package com.maccatoanthang.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.maccatoanthang.model.enums.RequestStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestUpdateRequest {

    private RequestStatus status;

    @Size(max = 10000, message = "Phản hồi của admin không được vượt quá 10.000 ký tự")
    private String adminReply;

    @NotNull(message = "Revision không được để trống")
    @Min(value = 0, message = "Revision không được âm")
    private Integer revision;

    @JsonIgnore
    @AssertTrue(message = "Cần trạng thái hoặc nội dung phản hồi")
    public boolean isUpdatePresent() {
        return status != null || (adminReply != null && !adminReply.isBlank());
    }

    public RequestStatus status() {
        return this.status;
    }

    public String adminReply() {
        return this.adminReply;
    }

    public Integer revision() {
        return this.revision;
    }
}
