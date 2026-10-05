package com.maccatoanthang.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maccatoanthang.dto.request.ItemInput;
import com.maccatoanthang.dto.request.UserInput;
import com.maccatoanthang.dto.request.UserProfileUpdateRequest;
import com.maccatoanthang.model.User;
import com.maccatoanthang.model.enums.UserRole;
import com.maccatoanthang.repository.UserRepository;
import com.maccatoanthang.security.JwtUtil;
import com.maccatoanthang.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserPortalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderService orderService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User userA;
    private User userB;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
        userA = userRepository.findByPhone("0977000111").orElseGet(() ->
                userRepository.save(User.builder()
                        .name("Người Dùng A")
                        .phone("0977000111")
                        .email("userA@test.com")
                        .password(passwordEncoder.encode("secret123"))
                        .role(UserRole.USER)
                        .address("Hà Nội")
                        .build())
        );

        userB = userRepository.findByPhone("0977000222").orElseGet(() ->
                userRepository.save(User.builder()
                        .name("Người Dùng B")
                        .phone("0977000222")
                        .email("userB@test.com")
                        .password(passwordEncoder.encode("secret123"))
                        .role(UserRole.USER)
                        .address("TP Hồ Chí Minh")
                        .build())
        );

        tokenA = jwtUtil.generateUserToken(userA.getPhone(), userA.getId());
        tokenB = jwtUtil.generateUserToken(userB.getPhone(), userB.getId());
    }

    // 1. GET /api/user/profile - Happy Path
    @Test
    void getProfile_happyPath_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/user/profile")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.phone").value(userA.getPhone()));
    }

    // 2. GET /api/user/profile - Unauthorized
    @Test
    void getProfile_unauthorized_shouldReturn401() throws Exception {
        mockMvc.perform(get("/api/user/profile"))
                .andExpect(status().isUnauthorized());
    }

    // 3. PUT /api/user/profile - Happy Path
    @Test
    void updateProfile_happyPath_shouldReturn200() throws Exception {
        UserProfileUpdateRequest req = new UserProfileUpdateRequest(
                "Người Dùng A Đổi Tên", "newemailA@test.com", "Địa chỉ mới"
        );

        mockMvc.perform(put("/api/user/profile")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Người Dùng A Đổi Tên"));
    }

    // 4. PUT /api/user/profile - Invalid Input
    @Test
    void updateProfile_invalidInput_shouldReturn400() throws Exception {
        UserProfileUpdateRequest req = new UserProfileUpdateRequest(
                "", "not-an-email", null
        );

        mockMvc.perform(put("/api/user/profile")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 5. GET /api/user/orders - Happy Path
    @Test
    void listOrders_happyPath_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/user/orders")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray());
    }

    // 6. GET /api/user/orders - Invalid Pagination
    @Test
    void listOrders_invalidPagination_shouldReturn400() throws Exception {
        mockMvc.perform(get("/api/user/orders")
                        .header("Authorization", "Bearer " + tokenA)
                        .param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 7. GET /api/user/orders/{id} - Happy Path (Own Order)
    @Test
    void getOrder_ownOrder_shouldReturn200() throws Exception {
        UserInput input = new UserInput(userA.getName(), userA.getPhone(), userA.getEmail(), userA.getAddress(), null, null);
        var created = orderService.createClient(new com.maccatoanthang.dto.request.ClientRequestSubmit(
                com.maccatoanthang.model.enums.RequestType.ORDER, java.util.UUID.randomUUID().toString(), input,
                List.of(new ItemInput("natural", 1)), com.maccatoanthang.model.enums.ShippingMethod.STANDARD,
                "cod", null, "Đơn test portal", null, null), userA);
        var orderResponse = orderService.get(created.getId(), userA.getId());

        mockMvc.perform(get("/api/user/orders/" + orderResponse.id())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(orderResponse.id()));
    }

    // 8. GET /api/user/orders/{id} - Forbidden (Other User's Order)
    @Test
    void getOrder_otherUserOrder_shouldReturn403Forbidden() throws Exception {
        UserInput input = new UserInput(userA.getName(), userA.getPhone(), userA.getEmail(), userA.getAddress(), null, null);
        var created = orderService.createClient(new com.maccatoanthang.dto.request.ClientRequestSubmit(
                com.maccatoanthang.model.enums.RequestType.ORDER, java.util.UUID.randomUUID().toString(), input,
                List.of(new ItemInput("natural", 1)), com.maccatoanthang.model.enums.ShippingMethod.STANDARD,
                "cod", null, "Đơn test portal 2", null, null), userA);
        var orderResponse = orderService.get(created.getId(), userA.getId());

        mockMvc.perform(get("/api/user/orders/" + orderResponse.id())
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 9. GET /api/user/orders/{id} - Not Found
    @Test
    void getOrder_notFound_shouldReturn404() throws Exception {
        mockMvc.perform(get("/api/user/orders/DH-NON-EXISTENT-999")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 10. GET /api/user/requests - Happy Path
    @Test
    void listRequests_happyPath_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/user/requests")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray());
    }
}
