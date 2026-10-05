package com.maccatoanthang.mapper;

import com.maccatoanthang.dto.response.OrderResponse;
import com.maccatoanthang.model.Order;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class OrderMapper {

    private final UserMapper userMapper;

    public OrderResponse toResponse(Order order) {
        if (order == null) {
            return null;
        }

        List<OrderResponse.Item> items = (order.getItems() == null)
                ? Collections.emptyList()
                : order.getItems().stream()
                        .map(i -> OrderResponse.Item.builder()
                                .id(i.getProductSnapshotId())
                                .name(i.getName())
                                .weight(i.getWeight())
                                .price(i.getPrice())
                                .quantity(i.getQuantity())
                                .build())
                        .toList();

        long itemsTotal = items.stream()
                .mapToLong(i -> (long) i.getPrice() * i.getQuantity())
                .sum();
        long total = order.getShippingFee() + itemsTotal;

        String statusLabel = switch (order.getStatus()) {
            case PENDING -> "Chờ xác nhận";
            case CONFIRMED -> "Đã xác nhận";
            case SHIPPING -> "Đang giao hàng";
            case COMPLETED -> "Hoàn thành";
            case CANCELLED -> "Đã hủy";
        };

        var userResp = userMapper.toResponse(order.getContact(), order.getUser());

        return OrderResponse.builder()
                .id(order.getId())
                .status(order.getStatus())
                .statusLabel(statusLabel)
                .user(userResp)
                .items(items)
                .shippingFee(order.getShippingFee())
                .total(total)
                .note(order.getNote())
                .source(order.getSource())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}
