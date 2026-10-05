package com.maccatoanthang.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.maccatoanthang.model.enums.RequestType;
import com.maccatoanthang.model.enums.ShippingMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientRequestSubmit {

    @NotNull(message = "Loại yêu cầu không được để trống")
    private RequestType type;

    @NotBlank(message = "Khóa idempotency không được để trống")
    @Size(max = 128, message = "Khóa idempotency không được vượt quá 128 ký tự")
    private String idempotencyKey;

    @Valid
    private UserInput user;

    @Size(max = 100, message = "Danh sách sản phẩm không được vượt quá 100 loại")
    private List<@NotNull @Valid ItemInput> items;

    @Builder.Default
    private ShippingMethod shipping = ShippingMethod.STANDARD;

    @Builder.Default
    @Pattern(regexp = "cod", message = "Hiện chỉ hỗ trợ phương thức thanh toán 'cod'")
    private String payment = "cod";

    @Size(max = 80, message = "Chủ đề không được vượt quá 80 ký tự")
    private String topic;

    @Size(max = 10000, message = "Nội dung không được vượt quá 10.000 ký tự")
    private String message;

    @Size(max = 50, message = "Chi tiết bổ sung không được vượt quá 50 thuộc tính")
    private Map<String, Object> details;

    @Min(value = 0, message = "Tổng tiền mong đợi không được âm")
    private Long expectedTotal;

    // Các trường tương thích ngược (Flat format)
    private String fullName;
    private String phone;
    private String email;
    private String address;
    private String note;
    private List<Map<String, Object>> cartItems;

    public void setFullName(String fullName) {
        this.fullName = fullName;
        ensureUser().setName(fullName);
    }

    public void setPhone(String phone) {
        this.phone = phone;
        ensureUser().setPhone(phone);
    }

    public void setEmail(String email) {
        this.email = email;
        ensureUser().setEmail(email);
    }

    public void setAddress(String address) {
        this.address = address;
        ensureUser().setAddress(address);
    }

    public void setNote(String note) {
        this.note = note;
        if (this.message == null || this.message.isBlank()) {
            this.message = note;
        }
    }

    public void setCartItems(List<Map<String, Object>> cartItems) {
        this.cartItems = cartItems;
        if (cartItems != null && !cartItems.isEmpty()) {
            this.items = cartItems.stream().map(map -> {
                Object pId = map.get("productId") != null ? map.get("productId") : map.get("id");
                Object q = map.get("quantity");
                int qty = (q instanceof Number n) ? n.intValue() : 1;
                return ItemInput.builder()
                        .id(pId != null ? pId.toString() : "SP01")
                        .quantity(qty)
                        .build();
            }).toList();
        }
    }

    private UserInput ensureUser() {
        if (this.user == null) {
            this.user = new UserInput();
        }
        return this.user;
    }

    public ClientRequestSubmit(
            RequestType type,
            String idempotencyKey,
            UserInput user,
            List<ItemInput> items,
            ShippingMethod shipping,
            String payment,
            String topic,
            String message,
            Map<String, Object> details,
            Long expectedTotal) {
        this.type = type;
        this.idempotencyKey = idempotencyKey;
        this.user = user;
        this.items = items;
        this.shipping = shipping != null ? shipping : ShippingMethod.STANDARD;
        this.payment = payment != null ? payment : "cod";
        this.topic = topic;
        this.message = message;
        this.details = details;
        this.expectedTotal = expectedTotal;
    }

    @JsonIgnore
    @AssertTrue(message = "Đơn hàng cần sản phẩm, địa chỉ, phương thức vận chuyển và thanh toán COD")
    public boolean isOrderValid() {
        return type != RequestType.ORDER || (items != null && !items.isEmpty() && shipping != null
                && "cod".equals(payment) && user != null && user.getAddress() != null && !user.getAddress().isBlank());
    }

    @JsonIgnore
    @AssertTrue(message = "Yêu cầu tư vấn/liên hệ cần nội dung")
    public boolean isMessageValid() {
        return type == null || type == RequestType.ORDER || (message != null && !message.isBlank());
    }

    public RequestType type() {
        return this.type;
    }

    public String idempotencyKey() {
        return this.idempotencyKey;
    }

    public UserInput customer() {
        return this.user;
    }

    public UserInput user() {
        return this.user;
    }

    public List<ItemInput> items() {
        return this.items;
    }

    public ShippingMethod shipping() {
        return this.shipping;
    }

    public String payment() {
        return this.payment;
    }

    public String topic() {
        return this.topic;
    }

    public String message() {
        return this.message;
    }

    public Map<String, Object> details() {
        return this.details;
    }

    public Long expectedTotal() {
        return this.expectedTotal;
    }
}
