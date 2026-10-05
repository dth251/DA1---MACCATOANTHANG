package com.maccatoanthang.service;

import com.maccatoanthang.dto.request.ClientRequestSubmit;
import com.maccatoanthang.dto.request.OrderCreateRequest;
import com.maccatoanthang.dto.request.StatusUpdateRequest;
import com.maccatoanthang.dto.response.OrderResponse;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.model.Order;
import com.maccatoanthang.model.User;

public interface OrderService {

    PageData<OrderResponse> list(int page, int limit, Long userId);

    OrderResponse get(String id, Long userId);

    OrderResponse create(OrderCreateRequest request);

    OrderResponse updateStatus(String id, StatusUpdateRequest request);

    Order createClient(ClientRequestSubmit request, User user);
}
