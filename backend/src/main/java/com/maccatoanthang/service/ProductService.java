package com.maccatoanthang.service;

import com.maccatoanthang.dto.request.ProductRequest;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.ProductResponse;
import com.maccatoanthang.model.enums.ProductCategory;

public interface ProductService {

    PageData<ProductResponse> list(int page, int limit, ProductCategory category, boolean admin);

    ProductResponse get(String id);

    ProductResponse get(String id, boolean admin);

    ProductResponse create(ProductRequest request);

    ProductResponse update(String id, ProductRequest request);

    void delete(String id);
}
