package com.maccatoanthang.controller;

import com.maccatoanthang.dto.request.LoginRequest;
import com.maccatoanthang.dto.request.RefreshTokenRequest;
import com.maccatoanthang.dto.request.RegisterRequest;
import com.maccatoanthang.dto.response.ApiResponse;
import com.maccatoanthang.dto.response.AuthResponse;
import com.maccatoanthang.security.UserPrincipal;
import com.maccatoanthang.service.AuthService;
import com.maccatoanthang.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Đăng nhập thành công", authService.login(request)));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Đăng ký tài khoản thành công", authService.register(request)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Làm mới token thành công", authService.refreshToken(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            authService.logout(authHeader.substring(7));
        }
        return ResponseEntity.ok(ApiResponse.ok("Đăng xuất thành công", null));
    }

    @GetMapping("/session")
    public ResponseEntity<ApiResponse<Object>> session(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Chưa đăng nhập", null));
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal up) {
            var profile = userService.profile(up.userId());
            return ResponseEntity.ok(ApiResponse.ok("Phiên đăng nhập hợp lệ",
                    Map.of("role", "USER", "user", profile, "customer", profile)));
        }
        String username = authentication.getName();
        return ResponseEntity.ok(ApiResponse.ok("Phiên đăng nhập hợp lệ", authService.session(username)));
    }
}
