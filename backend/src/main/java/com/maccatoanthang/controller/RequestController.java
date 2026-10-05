package com.maccatoanthang.controller;

import com.maccatoanthang.dto.request.ClientRequestSubmit;
import com.maccatoanthang.dto.request.RequestUpdateRequest;
import com.maccatoanthang.dto.response.ApiResponse;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.RequestResponse;
import com.maccatoanthang.dto.response.SubmissionResponse;
import com.maccatoanthang.security.UserPrincipal;
import com.maccatoanthang.service.RequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class RequestController {

    private final RequestService requestService;

    // Public endpoint: Guest or logged in user submitting order / consult / contact
    @PostMapping("/api/requests")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submit(
            @Valid @RequestBody ClientRequestSubmit request,
            @AuthenticationPrincipal Object principal) {
        Long userId = null;
        if (principal instanceof UserPrincipal up) {
            userId = up.userId();
        }
        SubmissionResponse response = requestService.submit(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Gửi yêu cầu thành công", response));
    }

    // Admin endpoints
    @GetMapping("/api/admin/requests")
    public ResponseEntity<ApiResponse<PageData<RequestResponse>>> listAdmin(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách yêu cầu thành công",
                requestService.list(page, limit, null)));
    }

    @PatchMapping("/api/admin/requests/{id}")
    public ResponseEntity<ApiResponse<RequestResponse>> updateAdmin(
            @PathVariable String id,
            @Valid @RequestBody RequestUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật yêu cầu thành công",
                requestService.update(id, request)));
    }
}
