package com.maccatoanthang.mapper;

import com.maccatoanthang.dto.response.ArticleResponse;
import com.maccatoanthang.model.Article;
import org.springframework.stereotype.Component;

@Component
public class ArticleMapper {

    public ArticleResponse toResponse(Article article) {
        if (article == null) {
            return null;
        }

        return ArticleResponse.builder()
                .slug(article.getSlug())
                .title(article.getTitle())
                .body(article.getBody())
                .category(article.getCategory())
                .label(article.getLabel())
                .image(article.getImage())
                .description(article.getDescription())
                .sortOrder(article.getSortOrder())
                .published(article.isPublished())
                .build();
    }
}
