package com.maccatoanthang.service.impl;

import com.maccatoanthang.dto.response.ArticleResponse;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.exception.BadRequestException;
import com.maccatoanthang.exception.ResourceNotFoundException;
import com.maccatoanthang.mapper.ArticleMapper;
import com.maccatoanthang.model.Article;
import com.maccatoanthang.model.enums.ArticleCategory;
import com.maccatoanthang.repository.ArticleRepository;
import com.maccatoanthang.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArticleServiceImpl implements ArticleService {

    private final ArticleRepository articleRepository;

    private final ArticleMapper articleMapper;

    @Override
    public PageData<ArticleResponse> list(int page, int limit, ArticleCategory category) {
        if (page < 1 || limit < 1) {
            throw new BadRequestException("Số trang và số lượng mỗi trang phải lớn hơn 0");
        }
        int pageIndex = page - 1;
        int pageSize = Math.min(100, limit);
        var pageable = PageRequest.of(pageIndex, pageSize);

        Page<Article> paged = category != null
                ? articleRepository.findByCategoryAndPublishedTrueOrderBySortOrderAscSlugAsc(category, pageable)
                : articleRepository.findByPublishedTrueOrderBySortOrderAscSlugAsc(pageable);
        return PageData.from(paged.map(articleMapper::toResponse));
    }

    @Override
    public PageData<ArticleResponse> listAdmin(int page, int limit, ArticleCategory category) {
        if (page < 1 || limit < 1) {
            throw new BadRequestException("Số trang và số lượng mỗi trang phải lớn hơn 0");
        }
        int pageIndex = page - 1;
        int pageSize = Math.min(100, limit);
        var pageable = PageRequest.of(pageIndex, pageSize);

        Page<Article> paged = category != null
                ? articleRepository.findByCategoryOrderBySortOrderAscSlugAsc(category, pageable)
                : articleRepository.findByOrderBySortOrderAscSlugAsc(pageable);
        return PageData.from(paged.map(articleMapper::toResponse));
    }

    @Override
    public ArticleResponse get(String slug) {
        Article article = articleRepository.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết: " + slug));
        return articleMapper.toResponse(article);
    }

    @Override
    @Transactional
    public ArticleResponse create(com.maccatoanthang.dto.request.ArticleRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new BadRequestException("Tiêu đề bài viết không được để trống");
        }
        if (request.getBody() == null || request.getBody().isBlank()) {
            throw new BadRequestException("Nội dung bài viết không được để trống");
        }
        if (request.getCategory() == null) {
            throw new BadRequestException("Danh mục bài viết không được để trống");
        }

        String slug = generateSlug(request.getTitle(), request.getSlug());
        String label = (request.getLabel() != null && !request.getLabel().isBlank())
                ? request.getLabel().trim()
                : defaultLabel(request.getCategory());
        String image = (request.getImage() != null && !request.getImage().isBlank())
                ? request.getImage().trim()
                : "assets/macca-natural.png";

        Article article = Article.builder()
                .slug(slug)
                .title(request.getTitle().trim())
                .body(request.getBody().trim())
                .category(request.getCategory())
                .label(label)
                .image(image)
                .description(request.getDescription() != null ? request.getDescription().trim() : "")
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .published(request.getPublished() != null ? request.getPublished() : true)
                .build();

        Article saved = articleRepository.saveAndFlush(article);
        return articleMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ArticleResponse update(String slug, com.maccatoanthang.dto.request.ArticleRequest request) {
        Article article = articleRepository.findById(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết: " + slug));

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            article.setTitle(request.getTitle().trim());
        }
        if (request.getBody() != null && !request.getBody().isBlank()) {
            article.setBody(request.getBody().trim());
        }
        if (request.getCategory() != null) {
            article.setCategory(request.getCategory());
        }
        if (request.getLabel() != null && !request.getLabel().isBlank()) {
            article.setLabel(request.getLabel().trim());
        }
        if (request.getImage() != null && !request.getImage().isBlank()) {
            article.setImage(request.getImage().trim());
        }
        if (request.getDescription() != null) {
            article.setDescription(request.getDescription().trim());
        }
        if (request.getSortOrder() != null) {
            article.setSortOrder(request.getSortOrder());
        }
        if (request.getPublished() != null) {
            article.setPublished(request.getPublished());
        }

        Article saved = articleRepository.saveAndFlush(article);
        return articleMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(String slug) {
        Article article = articleRepository.findById(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài viết: " + slug));
        articleRepository.delete(article);
    }

    private String generateSlug(String title, String customSlug) {
        String base = (customSlug != null && !customSlug.isBlank()) ? customSlug.trim() : toSlug(title);
        if (base.isBlank()) {
            base = "bai-viet";
        }
        if (!articleRepository.existsById(base)) {
            return base;
        }
        String candidate = base + "-" + (System.currentTimeMillis() % 10000);
        int counter = 1;
        while (articleRepository.existsById(candidate)) {
            candidate = base + "-" + counter++;
        }
        return candidate;
    }

    private String toSlug(String input) {
        if (input == null) return "";
        String normalized = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        String withoutAccents = normalized.replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase()
                .replace("đ", "d")
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-");
    }

    private String defaultLabel(ArticleCategory category) {
        if (category == null) return "GÓC MACCA";
        return switch (category) {
            case ENJOY -> "THƯỞNG THỨC";
            case KITCHEN -> "GÓC BẾP";
            case GIFT -> "QUÀ TẶNG";
        };
    }
}
