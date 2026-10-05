package com.maccatoanthang.service;

import com.maccatoanthang.dto.request.LoginRequest;
import com.maccatoanthang.dto.request.RegisterRequest;
import com.maccatoanthang.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(com.maccatoanthang.dto.request.RefreshTokenRequest request);

    AuthResponse.AdminUser session(String username);

    void logout(String token);
}
