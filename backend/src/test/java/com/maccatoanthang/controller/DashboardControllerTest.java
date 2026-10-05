package com.maccatoanthang.controller;

import com.maccatoanthang.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        adminToken = jwtUtil.generateAdminToken("admin");
        userToken = jwtUtil.generateUserToken("0944112233", 555L);
    }

    // 1. GET /api/admin/dashboard - Happy Path (Admin)
    @Test
    void getDashboard_happyPath_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalProducts").isNumber())
                .andExpect(jsonPath("$.data.totalOrders").isNumber())
                .andExpect(jsonPath("$.data.totalUsers").isNumber())
                .andExpect(jsonPath("$.data.completedOrderValue").isNumber());
    }

    // 2. GET /api/admin/dashboard - Unauthorized (No Token)
    @Test
    void getDashboard_unauthorized_shouldReturn401() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    // 3. GET /api/admin/dashboard - Forbidden (User Role)
    @Test
    void getDashboard_forbidden_shouldReturn403() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 4. GET /api/admin/export - Happy Path (Admin)
    @Test
    void exportSystemData_happyPath_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/admin/export")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.products").isArray())
                .andExpect(jsonPath("$.data.orders").isArray())
                .andExpect(jsonPath("$.data.users").isArray())
                .andExpect(jsonPath("$.data.articles").isArray())
                .andExpect(jsonPath("$.data.requests").isArray());
    }

    // 5. GET /api/admin/export - Unauthorized
    @Test
    void exportSystemData_unauthorized_shouldReturn401() throws Exception {
        mockMvc.perform(get("/api/admin/export"))
                .andExpect(status().isUnauthorized());
    }

    // 6. GET /api/admin/export - Forbidden
    @Test
    void exportSystemData_forbidden_shouldReturn403() throws Exception {
        mockMvc.perform(get("/api/admin/export")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }
}
