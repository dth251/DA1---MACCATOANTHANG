package com.maccatoanthang.service;

import com.maccatoanthang.dto.request.LoginRequest;
import com.maccatoanthang.dto.request.RegisterRequest;
import com.maccatoanthang.dto.response.AuthResponse;
import com.maccatoanthang.exception.ConflictException;
import com.maccatoanthang.model.User;
import com.maccatoanthang.model.enums.UserRole;
import com.maccatoanthang.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testRegisterNewUser_Success() {
        RegisterRequest req = new RegisterRequest(
                "Lê Hoàng D", "0918765432", "d@example.com", "securePass123"
        );
        AuthResponse res = authService.register(req);
        assertNotNull(res.token());
        assertEquals("Bearer", res.tokenType());
        assertNotNull(res.user());
        assertEquals(UserRole.USER, res.user().role());
    }

    @Test
    void testRegisterWithUsername_SuccessAndCanLoginByUsername() {
        RegisterRequest req = new RegisterRequest(
                "user_pro", "Trần Khách VIP", "0918889999", "vip@example.com", "securePass123"
        );
        AuthResponse res = authService.register(req);
        assertNotNull(res.token());
        assertEquals("user_pro", res.user().username());

        // Login using username
        LoginRequest loginReq = new LoginRequest("user_pro", "securePass123");
        AuthResponse loginRes = authService.login(loginReq);
        assertNotNull(loginRes.token());
        assertEquals("user_pro", loginRes.user().username());

        // Login using phone
        LoginRequest loginPhoneReq = new LoginRequest("0918889999", "securePass123");
        AuthResponse loginPhoneRes = authService.login(loginPhoneReq);
        assertNotNull(loginPhoneRes.token());
        assertEquals("user_pro", loginPhoneRes.user().username());

        // Login using email should be rejected (system only allows username or phone)
        LoginRequest loginEmailReq = new LoginRequest("vip@example.com", "securePass123");
        assertThrows(org.springframework.security.authentication.BadCredentialsException.class,
                () -> authService.login(loginEmailReq));
    }

    @Test
    void testRegisterWithDuplicateUsername_ThrowsConflictException() {
        RegisterRequest req1 = new RegisterRequest(
                "user_trunglap", "Khách A", "0911111111", "a@example.com", "pass123"
        );
        authService.register(req1);

        RegisterRequest req2 = new RegisterRequest(
                "user_trunglap", "Khách B", "0922222222", "b@example.com", "pass456"
        );
        assertThrows(ConflictException.class, () -> authService.register(req2));
    }

    @Test
    void testRegisterWithAdminUsername_ThrowsConflictException() {
        RegisterRequest req = new RegisterRequest(
                "admin", "Kẻ Mạo Danh", "0933333333", "fake@example.com", "pass123"
        );
        assertThrows(ConflictException.class, () -> authService.register(req));
    }

    @Test
    void testLegacyGuestCannotBeClaimedWithoutVerification() {
        // Pre-create guest user
        String phone = "0944556677";
        User guest = userRepository.save(User.builder()
                .name("Guest User")
                .phone(phone)
                .role(UserRole.GUEST)
                .address("Cần Thơ")
                .build());
        Long guestId = guest.getId();

        // User registers with same phone
        RegisterRequest req = new RegisterRequest(
                "Nguyễn Thành Thật", phone, "that@example.com", "pass123456"
        );
        assertThrows(ConflictException.class, () -> authService.register(req));
        assertEquals(UserRole.GUEST, userRepository.findById(guestId).orElseThrow().getRole());
    }

    @Test
    void testRegisterUserAgain_ThrowsConflictException() {
        String phone = "0977889900";
        RegisterRequest req = new RegisterRequest(
                "Trần Văn E", phone, "e@example.com", "password123"
        );
        authService.register(req);

        // Register again with same phone
        RegisterRequest duplicate = new RegisterRequest(
                "Trần Văn E2", phone, "e2@example.com", "password456"
        );
        assertThrows(ConflictException.class, () -> authService.register(duplicate));
    }
}
