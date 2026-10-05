package com.maccatoanthang.controller;

import com.maccatoanthang.dto.response.ApiResponse;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.UserResponse;
import com.maccatoanthang.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/admin/users", "/api/admin/customers"})
@RequiredArgsConstructor
public class UserAdminController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageData<UserResponse>>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách người dùng thành công",
                userService.list(page, limit)));
    }
}
