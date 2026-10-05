package com.maccatoanthang.service.impl;

import com.maccatoanthang.dto.request.LoginRequest;
import com.maccatoanthang.dto.request.RegisterRequest;
import com.maccatoanthang.dto.request.RefreshTokenRequest;
import com.maccatoanthang.dto.response.AuthResponse;
import com.maccatoanthang.dto.response.UserResponse;
import com.maccatoanthang.exception.ConflictException;
import com.maccatoanthang.exception.UnauthorizedException;
import com.maccatoanthang.mapper.UserMapper;
import com.maccatoanthang.model.User;
import com.maccatoanthang.model.enums.UserRole;
import com.maccatoanthang.repository.UserRepository;
import com.maccatoanthang.security.JwtUtil;
import com.maccatoanthang.service.AuthService;
import com.maccatoanthang.util.Passwords;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {
    private final String adminUsername;
    private final String adminPassword;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(@Value("${app.admin.username:admin}") String adminUsername,
                           @Value("${app.admin.password}") String adminPassword,
                           JwtUtil jwtUtil, UserRepository userRepository,
                           UserMapper userMapper, PasswordEncoder passwordEncoder) {
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public AuthResponse register(RegisterRequest request) {
        Passwords.validate(request.password());
        if (userRepository.findByPhone(request.phone()).isPresent()) {
            // Legacy guests must be verified before any history is linked to an account.
            throw new ConflictException("Số điện thoại đã được sử dụng; cần xác minh quyền sở hữu trước khi liên kết tài khoản");
        }
        String username = request.username();
        if (username != null && (adminUsername.equalsIgnoreCase(username)
                || username.matches("0[0-9]{9}")
                || userRepository.findByUsername(username).isPresent())) {
            throw new ConflictException("Tên đăng nhập không khả dụng");
        }
        User user = userRepository.saveAndFlush(User.builder().name(request.name()).username(username)
                .phone(request.phone()).email(request.email())
                .password(passwordEncoder.encode(request.password())).role(UserRole.USER).build());
        return response(jwtUtil.issue(user.getPhone(), "USER", user.getId()), "USER", userMapper.toResponse(user));
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        Passwords.validate(request.password());
        if (adminUsername.equals(request.username()) && adminPassword.equals(request.password())) {
            return response(jwtUtil.issue(adminUsername, "ADMIN", null), "ADMIN", adminInfo());
        }
        User user = (request.username() != null && request.username().matches("0[0-9]{9}")
                ? userRepository.findByPhone(request.username())
                : userRepository.findByUsername(request.username())).orElse(null);
        if (user == null || user.getRole() != UserRole.USER || user.getPassword() == null
                || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác");
        }
        return response(jwtUtil.issue(user.getPhone(), "USER", user.getId()), "USER", userMapper.toResponse(user));
    }

    @Override
    @Transactional(noRollbackFor = UnauthorizedException.class)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        var claims = jwtUtil.extractAllClaims(request.refreshToken());
        String role = claims.get("role", String.class);
        UserResponse info;
        if ("ADMIN".equals(role) && adminUsername.equals(claims.getSubject())) {
            info = adminInfo();
        } else if ("USER".equals(role)) {
            Long id = claims.get("userId", Long.class);
            if (id == null) { throw new UnauthorizedException("Tài khoản không hợp lệ"); }
            User user = userRepository.findById(id)
                    .filter(u -> u.getRole() == UserRole.USER && u.getPhone().equals(claims.getSubject()))
                    .orElseThrow(() -> new UnauthorizedException("Tài khoản không hợp lệ"));
            info = userMapper.toResponse(user);
        } else {
            throw new UnauthorizedException("Quyền hạn token không hợp lệ");
        }
        return response(jwtUtil.rotate(request.refreshToken()), role, info);
    }

    private UserResponse adminInfo() {
        return UserResponse.builder().name(adminUsername).username(adminUsername).role(UserRole.ADMIN).build();
    }

    private AuthResponse response(JwtUtil.TokenPair pair, String role, UserResponse info) {
        return new AuthResponse(pair.accessToken(), pair.refreshToken(), "Bearer", jwtUtil.expiresIn(), role, info);
    }

    @Override
    public AuthResponse.AdminUser session(String username) {
        return new AuthResponse.AdminUser(username, "ADMIN");
    }

    @Override
    public void logout(String token) {
        if (token != null && !token.isBlank()) { jwtUtil.revoke(token); }
    }
}
