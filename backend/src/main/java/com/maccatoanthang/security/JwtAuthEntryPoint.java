package com.maccatoanthang.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maccatoanthang.dto.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper mapper;

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException) throws IOException {

        log.warn("CẢNH BÁO BẢO MẬT: Truy cập chưa xác thực vào URL: {} - Lỗi: {}",
                request.getRequestURI(),
                authException != null ? authException.getMessage() : "Chưa đăng nhập");

        String jwtError = (String) request.getAttribute("jwt_error");
        if (jwtError == null) {
            String headerAuth = request.getHeader("Authorization");
            if (headerAuth != null && headerAuth.startsWith("Bearer ")) {
                jwtError = "Token hết hạn hoặc không hợp lệ";
            }
        }

        String errorMessage = (jwtError != null)
                ? jwtError
                : "Thiếu hoặc token không hợp lệ. Vui lòng đăng nhập";

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiResponse<Void> apiResponse = ApiResponse.error(errorMessage, null);
        mapper.writeValue(response.getOutputStream(), apiResponse);
        response.flushBuffer();
    }
}
