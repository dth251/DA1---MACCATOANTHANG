package com.maccatoanthang.repository;

import com.maccatoanthang.model.Article;
import com.maccatoanthang.model.enums.ArticleCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ArticleRepository extends JpaRepository<Article, String> {

    Optional<Article> findBySlugAndPublishedTrue(String slug);

    Page<Article> findByPublishedTrueOrderBySortOrderAscSlugAsc(Pageable pageable);

    Page<Article> findByCategoryAndPublishedTrueOrderBySortOrderAscSlugAsc(ArticleCategory category, Pageable pageable);

    Page<Article> findByOrderBySortOrderAscSlugAsc(Pageable pageable);

    Page<Article> findByCategoryOrderBySortOrderAscSlugAsc(ArticleCategory category, Pageable pageable);
}
