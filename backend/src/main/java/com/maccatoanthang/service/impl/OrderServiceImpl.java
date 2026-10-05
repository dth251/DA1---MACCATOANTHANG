package com.maccatoanthang.service.impl;

import com.maccatoanthang.dto.request.ClientRequestSubmit;
import com.maccatoanthang.dto.request.ItemInput;
import com.maccatoanthang.dto.request.OrderCreateRequest;
import com.maccatoanthang.dto.request.StatusUpdateRequest;
import com.maccatoanthang.dto.response.OrderResponse;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.exception.BadRequestException;
import com.maccatoanthang.exception.ConflictException;
import com.maccatoanthang.exception.ForbiddenException;
import com.maccatoanthang.exception.ResourceNotFoundException;
import com.maccatoanthang.mapper.OrderMapper;
import com.maccatoanthang.model.Order;
import com.maccatoanthang.model.OrderItem;
import com.maccatoanthang.model.Product;
import com.maccatoanthang.model.User;
import com.maccatoanthang.model.enums.OrderSource;
import com.maccatoanthang.model.enums.OrderStatus;
import com.maccatoanthang.model.enums.ShippingMethod;
import com.maccatoanthang.repository.OrderRepository;
import com.maccatoanthang.repository.ProductRepository;
import com.maccatoanthang.service.OrderService;
import com.maccatoanthang.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Comparator;
import com.maccatoanthang.model.ContactSnapshot;
import com.maccatoanthang.exception.PriceChangedException;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;

    private final ProductRepository productRepository;

    private final UserService userService;

    private final OrderMapper orderMapper;

    @Override
    @Transactional(readOnly = true)
    public PageData<OrderResponse> list(int page, int limit, Long userId) {
        if (page < 1 || limit < 1) {
            throw new BadRequestException("Số trang và số lượng mỗi trang phải lớn hơn 0");
        }
        int pageIndex = page - 1;
        int pageSize = Math.min(100, limit);
        var pageable = PageRequest.of(pageIndex, pageSize);

        Page<Order> paged = userId != null
                ? orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                : orderRepository.findAll(PageRequest.of(pageIndex, pageSize, Sort.by("createdAt").descending()));

        return PageData.from(paged.map(orderMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse get(String id, Long userId) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng: " + id));

        if (userId != null && (order.getUser() == null || !userId.equals(order.getUser().getId()))) {
            throw new ForbiddenException("Bạn không có quyền truy cập đơn hàng này");
        }

        return orderMapper.toResponse(order);
    }

    @Override
    public OrderResponse create(OrderCreateRequest request) {
        User user = userService.resolve(request.user(), null);
        String orderId = generateOrderId();

        Order order = Order.builder()
                .id(orderId)
                .user(user)
                .contact(ContactSnapshot.from(request.user(), user))
                .shippingFee(request.shippingFee())
                .note(request.note())
                .source(OrderSource.ADMIN)
                .status(OrderStatus.PENDING)
                .build();

        reserveItems(order, request.items());

        Order saved = orderRepository.saveAndFlush(order);
        return orderMapper.toResponse(saved);
    }

    @Override
    public OrderResponse updateStatus(String id, StatusUpdateRequest request) {
        Order order = orderRepository.findLocked(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng: " + id));
        validateStatusTransition(order.getStatus(), request.status());
        if (order.getStatus() != OrderStatus.CANCELLED && request.status() == OrderStatus.CANCELLED) {
            for (OrderItem item : order.getItems().stream()
                    .sorted(Comparator.comparing(OrderItem::getProductSnapshotId)).toList()) {
                if (item.isStockReserved()) {
                    productRepository.findLocked(item.getProductSnapshotId()).ifPresent(product -> {
                        if (product.getStock() != null) {
                            product.setStock(Math.addExact(product.getStock(), item.getQuantity()));
                        }
                    });
                    item.setStockReserved(false);
                }
            }
        }
        order.setStatus(request.status());
        Order saved = orderRepository.saveAndFlush(order);
        return orderMapper.toResponse(saved);
    }

    @Override
    public Order createClient(ClientRequestSubmit request, User user) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new BadRequestException("Đơn hàng phải chứa ít nhất một sản phẩm");
        }

        int shippingFee = (request.shipping() == ShippingMethod.EXPRESS) ? 45000 : 30000;
        String orderId = generateOrderId();

        Order order = Order.builder()
                .id(orderId)
                .user(user)
                .contact(ContactSnapshot.from(request.user(), user))
                .shippingMethod(request.shipping())
                .shippingFee(shippingFee)
                .note(request.message())
                .source(OrderSource.CLIENT)
                .status(OrderStatus.PENDING)
                .build();

        reserveItems(order, request.items());
        long total = shippingFee + order.getItems().stream()
                .mapToLong(i -> (long) i.getPrice() * i.getQuantity()).sum();
        if (request.expectedTotal() != null && request.expectedTotal() != total) {
            throw new PriceChangedException(total);
        }

        return orderRepository.saveAndFlush(order);
    }

    private void reserveItems(Order order, List<ItemInput> inputs) {
        List<ItemInput> merged = mergeDuplicateItems(inputs);
        if (merged.isEmpty()) { throw new BadRequestException("Đơn hàng phải có sản phẩm"); }
        // All checkouts acquire product locks in the same order to avoid deadlocks.
        for (ItemInput input : merged.stream().sorted(Comparator.comparing(ItemInput::id)).toList()) {
            Product product = productRepository.findLocked(input.id())
                    .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm không tồn tại: " + input.id()));
            if (!product.isActive()) { throw new ConflictException("Sản phẩm đã ngừng bán: " + input.id()); }
            boolean tracked = product.getStock() != null;
            if (tracked) {
                if (product.getStock() < input.quantity()) {
                    throw new ConflictException("Sản phẩm không đủ tồn kho: " + input.id());
                }
                product.setStock(product.getStock() - input.quantity());
            }
            order.addItem(OrderItem.builder().productSnapshotId(product.getId()).name(product.getName())
                    .weight(product.getWeight()).price(product.getPrice()).quantity(input.quantity())
                    .stockReserved(tracked).build());
        }
    }

    private void validateStatusTransition(OrderStatus current, OrderStatus next) {
        if (current == next) {
            return;
        }
        boolean allowed = switch (current) {
            case PENDING -> (next == OrderStatus.CONFIRMED || next == OrderStatus.CANCELLED);
            case CONFIRMED -> (next == OrderStatus.SHIPPING || next == OrderStatus.CANCELLED);
            case SHIPPING -> (next == OrderStatus.COMPLETED || next == OrderStatus.CANCELLED);
            case COMPLETED, CANCELLED -> false;
        };

        if (!allowed) {
            throw new ConflictException("Không thể chuyển trạng thái đơn hàng từ " + current + " sang " + next);
        }
    }

    private List<ItemInput> mergeDuplicateItems(List<ItemInput> items) {
        if (items == null) {
            return List.of();
        }
        Map<String, Integer> map = new LinkedHashMap<>();
        for (ItemInput item : items) {
            if (item == null || item.id() == null || item.quantity() == null
                    || item.quantity() < 1 || item.quantity() > 99) {
                throw new BadRequestException("Số lượng sản phẩm phải từ 1 đến 99");
            }
            map.merge(item.id(), item.quantity(), Integer::sum);
        }

        return map.entrySet().stream()
                .map(e -> {
                    if (e.getValue() > 99) {
                        throw new BadRequestException("Số lượng tối đa cho mỗi loại sản phẩm là 99");
                    }
                    return new ItemInput(e.getKey(), e.getValue());
                })
                .toList();
    }

    private String generateOrderId() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        return "DH-" + datePart + "-" + UUID.randomUUID();
    }
}
