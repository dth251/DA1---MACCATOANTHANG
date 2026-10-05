package com.maccatoanthang.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maccatoanthang.dto.request.LoginRequest;
import com.maccatoanthang.dto.request.RegisterRequest;
import com.maccatoanthang.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @org.springframework.beans.factory.annotation.Value("${app.admin.password:test-admin-password}")
    private String adminPassword;

    @Test
    void testAdminLogin_SuccessAndSessionCheck() throws Exception {
        LoginRequest req = new LoginRequest("admin", adminPassword);

        // 1. Admin Login -> 200 OK with token
        String responseContent = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.user.role").value("ADMIN"))
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(responseContent).get("data").get("accessToken").asText();

        // 2. Check Session with Bearer Token -> 200 OK
        mockMvc.perform(get("/api/auth/session")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("admin"));

        // 3. Logout -> 200 OK
        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 4. Session check after logout -> 401 Unauthorized (Token was revoked)
        mockMvc.perform(get("/api/auth/session")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testUserToken_CannotAccessAdminEndpoint() throws Exception {
        String userToken = jwtUtil.generateUserToken("0912345678", 1L);

        // User attempts to call /api/admin/orders -> 403 Forbidden
        mockMvc.perform(get("/api/admin/orders")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testAdminToken_CanAccessAdminEndpoint() throws Exception {
        String adminToken = jwtUtil.generateAdminToken("admin");

        mockMvc.perform(get("/api/admin/orders")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void testUnauthenticated_CannotAccessUserProfile() throws Exception {
        mockMvc.perform(get("/api/user/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testUserLoginViaSharedAuthEndpoint() throws Exception {
        // 1. Đăng ký người dùng qua /api/auth/register
        String regJson = """
            {
              "fullName": "Khách Test Chung",
              "phone": "0981122334",
              "password": "CustomerPass123@",
              "email": "khachchung@test.com"
            }
            """;
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));

        // 2. Người dùng đăng nhập tại CÙNG endpoint với Admin (/api/auth/login)
        LoginRequest userLoginReq = new LoginRequest("0981122334", "CustomerPass123@");
        String loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userLoginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.user.phone").value("0981122334"))
                .andReturn().getResponse().getContentAsString();

        String userToken = objectMapper.readTree(loginRes).get("data").get("accessToken").asText();

        // 3. Người dùng kiểm tra session tại /api/auth/session
        mockMvc.perform(get("/api/auth/session")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("USER"));
    }

    @Test
    void testRegisterWithInvalidData_Returns400() throws Exception {
        RegisterRequest invalid = new RegisterRequest("", "12345", "invalid-email", "123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errors").isMap());
    }

    @Test
    void testLoginWithWrongPassword_Returns401() throws Exception {
        LoginRequest wrongLogin = new LoginRequest("admin", "wrong_admin_password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongLogin)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testLoginWithEmptyCredentials_Returns400() throws Exception {
        String emptyLogin = "{}";

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(emptyLogin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testRefreshToken_Success() throws Exception {
        // 1. Login user to get access token and refresh token
        RegisterRequest regReq = new RegisterRequest("User Dual Token", "0988771122", "dual@example.com", "Password123@");
        String regRes = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String refreshToken = objectMapper.readTree(regRes).get("data").get("refreshToken").asText();
        org.junit.jupiter.api.Assertions.assertNotNull(refreshToken);

        // 2. Call /api/auth/refresh with refreshToken
        com.maccatoanthang.dto.request.RefreshTokenRequest refreshReq = new com.maccatoanthang.dto.request.RefreshTokenRequest(refreshToken);
        String refreshRes = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.refreshToken").isString())
                .andReturn().getResponse().getContentAsString();

        String newAccessToken = objectMapper.readTree(refreshRes).get("data").get("accessToken").asText();

        // 3. Test new access token works for session check
        mockMvc.perform(get("/api/auth/session")
                        .header("Authorization", "Bearer " + newAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void testUseRefreshTokenAsBearer_FailsWith401() throws Exception {
        // Create a refresh token
        String refreshToken = jwtUtil.generateUserRefreshToken("0988771122", 1L);

        // Try using refresh token as bearer token for API access -> 401 Unauthorized
        mockMvc.perform(get("/api/auth/session")
                        .header("Authorization", "Bearer " + refreshToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Không thể sử dụng Refresh Token")));
    }
}
