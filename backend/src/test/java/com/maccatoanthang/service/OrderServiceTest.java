package com.maccatoanthang.service;

import com.maccatoanthang.dto.request.ClientRequestSubmit;
import com.maccatoanthang.dto.request.ItemInput;
import com.maccatoanthang.dto.request.StatusUpdateRequest;
import com.maccatoanthang.dto.request.UserInput;
import com.maccatoanthang.dto.response.OrderResponse;
import com.maccatoanthang.exception.BadRequestException;
import com.maccatoanthang.model.Order;
import com.maccatoanthang.model.User;
import com.maccatoanthang.model.enums.OrderStatus;
import com.maccatoanthang.model.enums.RequestType;
import com.maccatoanthang.model.enums.ShippingMethod;
import com.maccatoanthang.model.enums.UserRole;
import com.maccatoanthang.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class OrderServiceTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserRepository userRepository;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = userRepository.save(User.builder()
                .name("Nguyễn Văn Test")
                .phone("0909" + UUID.randomUUID().toString().substring(0, 6))
                .role(UserRole.GUEST)
                .build());
    }

    @Test
    void testCreateClientOrder_MergesDuplicateProductItems() {
        UserInput userInput = new UserInput("Nguyễn Văn Test", sampleUser.getPhone(), null, "123 Đường A", null, null);
        // Duplicate product "natural" with qty 2 and qty 3
        List<ItemInput> items = List.of(
                new ItemInput("natural", 2),
                new ItemInput("natural", 3)
        );

        ClientRequestSubmit submit = new ClientRequestSubmit(
                RequestType.ORDER, "idem-" + UUID.randomUUID(), userInput, items,
                ShippingMethod.STANDARD, "cod", null, null, null, null
        );

        Order order = orderService.createClient(submit, sampleUser);
        assertNotNull(order.getId());
        assertTrue(order.getId().startsWith("DH-"));
        assertEquals(1, order.getItems().size(), "Các dòng cùng product ID phải được gộp lại làm 1 dòng duy nhất");
        assertEquals(5, order.getItems().get(0).getQuantity(), "Tổng số lượng sau gộp phải bằng 2 + 3 = 5");
        assertEquals(30000, order.getShippingFee(), "Phí ship STANDARD phải là 30.000 VNĐ");
    }

    @Test
    void testCreateClientOrder_ThrowsWhenQuantityExceeds99() {
        UserInput userInput = new UserInput("Nguyễn Văn Test", sampleUser.getPhone(), null, "123 Đường A", null, null);
        List<ItemInput> items = List.of(
                new ItemInput("natural", 60),
                new ItemInput("natural", 45) // Total = 105 > 99
        );

        ClientRequestSubmit submit = new ClientRequestSubmit(
                RequestType.ORDER, "idem-" + UUID.randomUUID(), userInput, items,
                ShippingMethod.STANDARD, "cod", null, null, null, null
        );

        assertThrows(BadRequestException.class, () -> orderService.createClient(submit, sampleUser));
    }

    @Test
    void testOrderStatusStateMachine_ValidTransitions() {
        UserInput userInput = new UserInput("Nguyễn Văn Test", sampleUser.getPhone(), null, "123 Đường A", null, null);
        ClientRequestSubmit submit = new ClientRequestSubmit(
                RequestType.ORDER, "idem-" + UUID.randomUUID(), userInput,
                List.of(new ItemInput("natural", 1)), ShippingMethod.EXPRESS, "cod", null, null, null, null
        );

        Order order = orderService.createClient(submit, sampleUser);
        assertEquals(OrderStatus.PENDING, order.getStatus());

        // PENDING -> CONFIRMED
        OrderResponse confirmed = orderService.updateStatus(order.getId(), new StatusUpdateRequest(OrderStatus.CONFIRMED));
        assertEquals(OrderStatus.CONFIRMED, confirmed.status());

        // CONFIRMED -> SHIPPING
        OrderResponse shipping = orderService.updateStatus(order.getId(), new StatusUpdateRequest(OrderStatus.SHIPPING));
        assertEquals(OrderStatus.SHIPPING, shipping.status());

        // SHIPPING -> COMPLETED
        OrderResponse completed = orderService.updateStatus(order.getId(), new StatusUpdateRequest(OrderStatus.COMPLETED));
        assertEquals(OrderStatus.COMPLETED, completed.status());
    }

    @Test
    void testOrderStatusStateMachine_InvalidTransitionThrowsBadRequest() {
        UserInput userInput = new UserInput("Nguyễn Văn Test", sampleUser.getPhone(), null, "123 Đường A", null, null);
        ClientRequestSubmit submit = new ClientRequestSubmit(
                RequestType.ORDER, "idem-" + UUID.randomUUID(), userInput,
                List.of(new ItemInput("natural", 1)), ShippingMethod.STANDARD, "cod", null, null, null, null
        );

        Order order = orderService.createClient(submit, sampleUser);

        // Cannot jump directly from PENDING -> COMPLETED
        assertThrows(com.maccatoanthang.exception.ConflictException.class, () ->
                orderService.updateStatus(order.getId(), new StatusUpdateRequest(OrderStatus.COMPLETED)));

        // Cancel order from PENDING
        orderService.updateStatus(order.getId(), new StatusUpdateRequest(OrderStatus.CANCELLED));

        // Cannot move from CANCELLED to CONFIRMED
        assertThrows(com.maccatoanthang.exception.ConflictException.class, () ->
                orderService.updateStatus(order.getId(), new StatusUpdateRequest(OrderStatus.CONFIRMED)));
    }
}
