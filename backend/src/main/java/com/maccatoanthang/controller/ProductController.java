package com.maccatoanthang.controller;

import com.maccatoanthang.dto.request.ProductRequest;
import com.maccatoanthang.dto.response.ApiResponse;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.ProductResponse;
import com.maccatoanthang.model.enums.ProductCategory;
import com.maccatoanthang.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // Public APIs
    @GetMapping("/api/products")
    public ResponseEntity<ApiResponse<PageData<ProductResponse>>> listPublic(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) ProductCategory category) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách sản phẩm thành công",
                productService.list(page, limit, category, false)));
    }

    @GetMapping("/api/products/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getPublic(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy chi tiết sản phẩm thành công",
                productService.get(id)));
    }

    // Admin APIs
    @GetMapping("/api/admin/products")
    public ResponseEntity<ApiResponse<PageData<ProductResponse>>> listAdmin(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) ProductCategory category) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách sản phẩm quản trị thành công",
                productService.list(page, limit, category, true)));
    }

    @GetMapping("/api/admin/products/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getAdmin(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy chi tiết sản phẩm quản trị thành công",
                productService.get(id, true)));
    }

    @PostMapping("/api/admin/products")
    public ResponseEntity<ApiResponse<ProductResponse>> createAdmin(@Valid @RequestBody ProductRequest request) {
        ProductResponse response = productService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Thêm sản phẩm mới thành công", response));
    }

    @PutMapping("/api/admin/products/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> updateAdmin(
            @PathVariable String id,
            @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật thông tin sản phẩm thành công",
                productService.update(id, request)));
    }

    @DeleteMapping("/api/admin/products/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAdmin(@PathVariable String id) {
        productService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Xóa sản phẩm thành công", null));
    }
}
