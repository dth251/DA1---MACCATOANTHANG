package com.maccatoanthang.service.impl;

import com.maccatoanthang.dto.request.ProductRequest;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.ProductResponse;
import com.maccatoanthang.exception.BadRequestException;
import com.maccatoanthang.exception.ConflictException;
import com.maccatoanthang.exception.ResourceNotFoundException;
import com.maccatoanthang.mapper.ProductMapper;
import com.maccatoanthang.model.Product;
import com.maccatoanthang.model.enums.ProductCategory;
import com.maccatoanthang.repository.OrderItemRepository;
import com.maccatoanthang.repository.ProductRepository;
import com.maccatoanthang.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    private final ProductMapper productMapper;

    private final OrderItemRepository orderItemRepository;

    @Override
    @Transactional(readOnly = true)
    public PageData<ProductResponse> list(int page, int limit, ProductCategory category, boolean admin) {
        if (page < 1 || limit < 1) {
            throw new BadRequestException("Số trang và số lượng mỗi trang phải lớn hơn 0");
        }
        int pageIndex = page - 1;
        int pageSize = Math.min(100, limit);
        var pageable = PageRequest.of(pageIndex, pageSize, Sort.by("id").ascending());

        Page<Product> paged;
        if (admin) {
            paged = category != null
                ? productRepository.findByCategory(category, pageable)
                : productRepository.findAll(pageable);
        } else {
            paged = category != null
                ? productRepository.findByCategoryAndActiveTrue(category, pageable)
                : productRepository.findByActiveTrue(pageable);
        }
        return PageData.from(paged.map(productMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse get(String id) {
        return get(id, false);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse get(String id, boolean admin) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm có mã: " + id));
        if (!admin && !product.isActive()) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm có mã: " + id);
        }
        return productMapper.toResponse(product);
    }

    @Override
    public ProductResponse create(ProductRequest request) {
        if (productRepository.count() >= 1000) {
            throw new BadRequestException("Hệ thống chỉ cho phép lưu tối đa 1.000 sản phẩm");
        }
        if (productRepository.existsById(request.id())) {
            throw new ConflictException("Mã sản phẩm đã tồn tại: " + request.id());
        }
        Product product = Product.builder()
                .id(request.id())
                .name(request.name())
                .category(request.category())
                .categoryName(request.categoryName())
                .image(request.image())
                .weight(request.weight())
                .price(request.price())
                .badge(request.badge())
                .description(request.description())
                .ingredients(request.ingredients())
                .stock(request.stock())
                .active(request.active() == null || request.active())
                .build();
        Product saved = productRepository.save(product);
        return productMapper.toResponse(saved);
    }

    @Override
    public ProductResponse update(String id, ProductRequest request) {
        Product product = productRepository.findLocked(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm có mã: " + id));
        if ((product.getStock() == null) != (request.stock() == null)
                && orderItemRepository.countActiveReservations(id) > 0) {
            throw new ConflictException("Không thể đổi chế độ tồn kho khi còn đơn đang giữ hàng");
        }
        productMapper.update(product, request);
        Product saved = productRepository.save(product);
        return productMapper.toResponse(saved);
    }

    @Override
    public void delete(String id) {
        Product product = productRepository.findLocked(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm có mã: " + id));
        if (orderItemRepository.countActiveReservations(id) > 0) {
            throw new ConflictException("Không thể xóa sản phẩm khi còn đơn đang giữ hàng; hãy ngừng bán sản phẩm");
        }
        productRepository.delete(product);
    }
}
