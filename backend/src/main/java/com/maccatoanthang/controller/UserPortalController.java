package com.maccatoanthang.controller;

import com.maccatoanthang.dto.request.UserProfileUpdateRequest;
import com.maccatoanthang.dto.response.ApiResponse;
import com.maccatoanthang.dto.response.OrderResponse;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.RequestResponse;
import com.maccatoanthang.dto.response.UserResponse;
import com.maccatoanthang.security.UserPrincipal;
import com.maccatoanthang.service.OrderService;
import com.maccatoanthang.service.RequestService;
import com.maccatoanthang.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/user", "/api/customer"})
@RequiredArgsConstructor
public class UserPortalController {

    private final UserService userService;

    private final OrderService orderService;

    private final RequestService requestService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy thông tin tài khoản thành công",
                userService.profile(principal.userId())));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UserProfileUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật thông tin thành công",
                userService.update(principal.userId(), request)));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.maccatoanthang.dto.request.ChangePasswordRequest request) {
        userService.changePassword(principal.userId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Đổi mật khẩu thành công", null));
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<PageData<OrderResponse>>> listOrders(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy lịch sử đơn hàng thành công",
                orderService.list(page, limit, principal.userId())));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy chi tiết đơn hàng thành công",
                orderService.get(id, principal.userId())));
    }

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<PageData<RequestResponse>>> listRequests(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy phản hồi yêu cầu thành công",
                requestService.list(page, limit, principal.userId())));
    }
}
