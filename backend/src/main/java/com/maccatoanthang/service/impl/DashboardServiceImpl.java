package com.maccatoanthang.service.impl;

import com.maccatoanthang.dto.response.ArticleResponse;
import com.maccatoanthang.dto.response.DashboardResponse;
import com.maccatoanthang.dto.response.ExportResponse;
import com.maccatoanthang.dto.response.OrderResponse;
import com.maccatoanthang.dto.response.ProductResponse;
import com.maccatoanthang.dto.response.RequestResponse;
import com.maccatoanthang.dto.response.UserResponse;
import com.maccatoanthang.mapper.ArticleMapper;
import com.maccatoanthang.mapper.OrderMapper;
import com.maccatoanthang.mapper.ProductMapper;
import com.maccatoanthang.mapper.RequestMapper;
import com.maccatoanthang.mapper.UserMapper;
import com.maccatoanthang.repository.ArticleRepository;
import com.maccatoanthang.repository.OrderRepository;
import com.maccatoanthang.repository.ProductRepository;
import com.maccatoanthang.repository.RequestRepository;
import com.maccatoanthang.repository.UserRepository;
import com.maccatoanthang.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final ProductRepository productRepository;

    private final OrderRepository orderRepository;

    private final UserRepository userRepository;

    private final RequestRepository requestRepository;

    private final ArticleRepository articleRepository;

    private final ProductMapper productMapper;

    private final ArticleMapper articleMapper;

    private final UserMapper userMapper;

    private final OrderMapper orderMapper;

    private final RequestMapper requestMapper;

    @Override
    public DashboardResponse summary() {
        long totalProducts = productRepository.count();
        long totalOrders = orderRepository.count();
        long totalUsers = orderRepository.countBuyers();
        long completedOrderValue = orderRepository.completedItemsValue() + orderRepository.completedShippingValue();

        return new DashboardResponse(totalProducts, totalOrders, totalUsers, completedOrderValue);
    }

    @Override
    public ExportResponse export() {
        List<ProductResponse> products = productRepository.findAll().stream()
                .map(productMapper::toResponse).toList();
        List<ArticleResponse> articles = articleRepository.findAll().stream()
                .map(articleMapper::toResponse).toList();
        List<UserResponse> users = userRepository.findAll().stream()
                .map(userMapper::toResponse).toList();
        List<OrderResponse> orders = orderRepository.findAll().stream()
                .map(orderMapper::toResponse).toList();
        List<RequestResponse> requests = requestRepository.findAll().stream()
                .map(requestMapper::toResponse).toList();

        return new ExportResponse(products, articles, users, orders, requests);
    }
}
