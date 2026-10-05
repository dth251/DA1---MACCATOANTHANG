package com.maccatoanthang.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maccatoanthang.dto.request.ClientRequestSubmit;
import com.maccatoanthang.dto.request.ItemInput;
import com.maccatoanthang.dto.request.RequestUpdateRequest;
import com.maccatoanthang.dto.request.UserInput;
import com.maccatoanthang.model.enums.RequestStatus;
import com.maccatoanthang.model.enums.RequestType;
import com.maccatoanthang.model.enums.ShippingMethod;
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
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RequestControllerTest {

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
        userToken = jwtUtil.generateUserToken("0933999888", 777L);
    }

    // 1. POST /api/requests (type="consult") - Happy Path & Idempotency
    @Test
    void submitConsult_happyPathAndIdempotent_shouldReturn201() throws Exception {
        String key = "test-idempotency-" + UUID.randomUUID();
        UserInput user = new UserInput("Trần Thị B", "0955667788", "b@test.com", "123 Lê Lợi", "Phường 1", "TP.HCM");
        ClientRequestSubmit req = new ClientRequestSubmit(
                RequestType.CONSULT, key, user, null, null, null,
                "Tư vấn quà tặng", "Tôi muốn tư vấn đơn hàng 50 hộp", null, null
        );

        // First submit -> 201 Created
        mockMvc.perform(post("/api/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").isString())
                .andExpect(jsonPath("$.data.type").value("consult"));

        // Second submit with same idempotency key -> 201 Created (idempotent receipt)
        mockMvc.perform(post("/api/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    // 2. POST /api/requests (type="order") - Happy Path
    @Test
    void submitOrder_happyPath_shouldReturn201() throws Exception {
        String key = "test-order-" + UUID.randomUUID();
        UserInput user = new UserInput("Lê Văn C", "0933445566", "c@test.com", "456 Nguyễn Huệ", "Bến Nghé", "Quận 1");
        ItemInput item = new ItemInput("natural", 2);
        ClientRequestSubmit req = new ClientRequestSubmit(
                RequestType.ORDER, key, user, List.of(item), ShippingMethod.STANDARD, "cod",
                null, "Giao giờ hành chính", null, null
        );

        mockMvc.perform(post("/api/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").isString())
                .andExpect(jsonPath("$.data.type").value("order"));
    }

    // 3. POST /api/requests (type="order") - Invalid Input (Empty Items)
    @Test
    void submitOrder_emptyItems_shouldReturn400() throws Exception {
        String key = "test-order-invalid-" + UUID.randomUUID();
        UserInput user = new UserInput("Lê Văn C", "0933445566", "c@test.com", "456 Nguyễn Huệ", "Bến Nghé", "Quận 1");
        ClientRequestSubmit req = new ClientRequestSubmit(
                RequestType.ORDER, key, user, List.of(), ShippingMethod.STANDARD, "cod",
                null, null, null, null
        );

        mockMvc.perform(post("/api/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 4. POST /api/requests - Missing User Info -> 400 Bad Request
    @Test
    void submitRequest_missingUser_shouldReturn400() throws Exception {
        ClientRequestSubmit req = new ClientRequestSubmit(
                RequestType.CONSULT, "key-test-missing-cust", null, null, null, null,
                "Tư vấn", "Nội dung", null, null
        );

        mockMvc.perform(post("/api/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 5. GET /api/admin/requests - Happy Path & Role Check
    @Test
    void listAdminRequests_happyPathAndRoleCheck() throws Exception {
        // 1. Admin -> 200 OK
        mockMvc.perform(get("/api/admin/requests")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray());

        // 2. Regular User -> 403 Forbidden
        mockMvc.perform(get("/api/admin/requests")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());

        // 3. No token -> 401 Unauthorized
        mockMvc.perform(get("/api/admin/requests"))
                .andExpect(status().isUnauthorized());
    }

    // 6. PATCH /api/admin/requests/{id} - Happy Path & Not Found
    @Test
    void updateAdminRequest_happyPathAndNotFound() throws Exception {
        // Create a consult request first
        String key = "test-update-req-" + UUID.randomUUID();
        UserInput user = new UserInput("Hoàng Văn D", "0988001122", "d@test.com", "Hà Nội", null, null);
        ClientRequestSubmit req = new ClientRequestSubmit(
                RequestType.CONSULT, key, user, null, null, null,
                "Tư vấn giá sỉ", "Cần báo giá 100 hộp", null, null
        );
        String submitRes = mockMvc.perform(post("/api/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();
        String requestId = objectMapper.readTree(submitRes).get("data").get("id").asText();

        // 1. Admin update status to PROCESSING -> 200 OK
        RequestUpdateRequest updateReq = new RequestUpdateRequest(RequestStatus.PROCESSING, "Đang liên hệ khách", 0);
        mockMvc.perform(patch("/api/admin/requests/" + requestId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("processing"));

        // 2. Not Found -> 404
        mockMvc.perform(patch("/api/admin/requests/NON-EXISTENT-REQ-999")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void submitOrder_flatLegacyPayload_shouldReturn201() throws Exception {
        String legacyJson = """
            {
              "type": "ORDER",
              "idempotencyKey": "legacy-order-test-unique",
              "fullName": "Nguyễn Văn A",
              "phone": "0987654321",
              "email": "nguyenvana@example.com",
              "address": "Số 123 Đường Lê Lợi, Quận 1, TP.HCM",
              "note": "Giao hàng giờ hành chính",
              "cartItems": [
                {
                  "productId": "natural",
                  "quantity": 2
                }
              ]
            }
            """;

        mockMvc.perform(post("/api/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(legacyJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").isString())
                .andExpect(jsonPath("$.data.type").value("order"));
    }
}
