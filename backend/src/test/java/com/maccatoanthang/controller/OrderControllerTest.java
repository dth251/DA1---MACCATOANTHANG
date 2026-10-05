package com.maccatoanthang.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maccatoanthang.dto.request.ItemInput;
import com.maccatoanthang.dto.request.OrderCreateRequest;
import com.maccatoanthang.dto.request.StatusUpdateRequest;
import com.maccatoanthang.dto.request.UserInput;
import com.maccatoanthang.model.enums.OrderStatus;
import com.maccatoanthang.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        adminToken = jwtUtil.generateAdminToken("admin");
        userToken = jwtUtil.generateUserToken("0912333444", 888L);
    }

    // 1. POST /api/admin/orders - Happy Path
    @Test
    void createOrder_happyPath_shouldReturn201() throws Exception {
        UserInput user = new UserInput("Khách Test Admin", "0966778899", "adminorder@example.com", "Hà Nội", null, null);
        OrderCreateRequest createReq = new OrderCreateRequest(
                user, List.of(new ItemInput("natural", 1)), 30000, "Đơn tạo bởi admin"
        );

        mockMvc.perform(post("/api/admin/orders")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").isString())
                .andExpect(jsonPath("$.data.status").value("pending"));
    }

    // 2. POST /api/admin/orders - Invalid Input
    @Test
    void createOrder_invalidInput_shouldReturn400() throws Exception {
        // Empty items list
        OrderCreateRequest createReq = new OrderCreateRequest(null, List.of(), 0, null);

        mockMvc.perform(post("/api/admin/orders")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 3. POST /api/admin/orders - Unauthorized & Forbidden
    @Test
    void createOrder_unauthorizedAndForbidden() throws Exception {
        UserInput user = new UserInput("Khách Test", "0966778899", "cust@example.com", "Hà Nội", null, null);
        OrderCreateRequest createReq = new OrderCreateRequest(
                user, List.of(new ItemInput("natural", 1)), 30000, "Ghi chú"
        );

        // No token -> 401
        mockMvc.perform(post("/api/admin/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isUnauthorized());

        // Regular user token -> 403
        mockMvc.perform(post("/api/admin/orders")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isForbidden());
    }

    // 4. GET /api/admin/orders - Happy Path
    @Test
    void listOrders_happyPath_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/admin/orders")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray());
    }

    // 5. GET /api/admin/orders - Invalid Pagination
    @Test
    void listOrders_invalidPagination_shouldReturn400() throws Exception {
        mockMvc.perform(get("/api/admin/orders")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 6. GET /api/admin/orders/{id} - Happy Path & Not Found
    @Test
    void getOrder_happyPathAndNotFound() throws Exception {
        // Create an order first
        UserInput user = new UserInput("Khách Test Detail", "0966112233", "detail@example.com", "Đà Nẵng", null, null);
        OrderCreateRequest createReq = new OrderCreateRequest(
                user, List.of(new ItemInput("natural", 1)), 30000, "Chi tiết đơn"
        );
        String res = mockMvc.perform(post("/api/admin/orders")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String orderId = objectMapper.readTree(res).get("data").get("id").asText();

        // Get by ID -> 200 OK
        mockMvc.perform(get("/api/admin/orders/" + orderId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(orderId));

        // Non-existent ID -> 404 Not Found
        mockMvc.perform(get("/api/admin/orders/DH-NON-EXISTENT-888")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 7. PATCH /api/admin/orders/{id}/status - Happy Path (PENDING -> CONFIRMED)
    @Test
    void updateStatus_happyPath_shouldReturn200() throws Exception {
        UserInput user = new UserInput("Khách Status Test", "0966445566", "status@example.com", "Hà Nội", null, null);
        OrderCreateRequest createReq = new OrderCreateRequest(
                user, List.of(new ItemInput("natural", 1)), 30000, "Đơn đổi trạng thái"
        );
        String res = mockMvc.perform(post("/api/admin/orders")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String orderId = objectMapper.readTree(res).get("data").get("id").asText();

        // Update to CONFIRMED -> 200 OK
        StatusUpdateRequest updateReq = new StatusUpdateRequest(OrderStatus.CONFIRMED);
        mockMvc.perform(patch("/api/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("confirmed"));
    }

    // 8. PATCH /api/admin/orders/{id}/status - Conflict (Cancelled order cannot be completed)
    @Test
    void updateStatus_cancelledOrder_cannotBeCompleted_shouldReturn409() throws Exception {
        UserInput user = new UserInput("Khách Cancel Test", "0966445577", "cancel@example.com", "Hà Nội", null, null);
        OrderCreateRequest createReq = new OrderCreateRequest(
                user, List.of(new ItemInput("natural", 1)), 30000, "Đơn hủy"
        );
        String res = mockMvc.perform(post("/api/admin/orders")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String orderId = objectMapper.readTree(res).get("data").get("id").asText();

        // 1. Cancel the order -> 200 OK
        mockMvc.perform(patch("/api/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new StatusUpdateRequest(OrderStatus.CANCELLED))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("cancelled"));

        // 2. Try to change from CANCELLED to COMPLETED -> 409 Conflict
        mockMvc.perform(patch("/api/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new StatusUpdateRequest(OrderStatus.COMPLETED))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }
}
