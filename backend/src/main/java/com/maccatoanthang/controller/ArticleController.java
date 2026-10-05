package com.maccatoanthang.controller;

import com.maccatoanthang.dto.request.ArticleRequest;
import com.maccatoanthang.dto.response.ApiResponse;
import com.maccatoanthang.dto.response.ArticleResponse;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.model.enums.ArticleCategory;
import com.maccatoanthang.service.ArticleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
public class ArticleController {

    private final ArticleService articleService;

    @GetMapping("/api/articles")
    public ResponseEntity<ApiResponse<PageData<ArticleResponse>>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) ArticleCategory category) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách bài viết thành công",
                articleService.list(page, limit, category)));
    }

    @GetMapping("/api/articles/{slug}")
    public ResponseEntity<ApiResponse<ArticleResponse>> get(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy chi tiết bài viết thành công",
                articleService.get(slug)));
    }

    @GetMapping("/api/admin/articles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageData<ArticleResponse>>> listAdmin(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) ArticleCategory category) {
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách bài viết quản trị thành công",
                articleService.listAdmin(page, limit, category)));
    }

    @PostMapping({"/api/admin/articles", "/api/articles"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ArticleResponse>> create(@Valid @RequestBody ArticleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tạo bài viết mới thành công", articleService.create(request)));
    }

    @PutMapping({"/api/admin/articles/{slug}", "/api/articles/{slug}"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ArticleResponse>> update(
            @PathVariable String slug,
            @Valid @RequestBody ArticleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật bài viết thành công",
                articleService.update(slug, request)));
    }

    @DeleteMapping({"/api/admin/articles/{slug}", "/api/articles/{slug}"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String slug) {
        articleService.delete(slug);
        return ResponseEntity.ok(ApiResponse.ok("Xóa bài viết thành công", null));
    }
}
