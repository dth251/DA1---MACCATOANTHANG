package com.maccatoanthang.service;

import com.maccatoanthang.dto.request.ArticleRequest;
import com.maccatoanthang.dto.response.ArticleResponse;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.model.enums.ArticleCategory;

public interface ArticleService {

    PageData<ArticleResponse> list(int page, int limit, ArticleCategory category);

    PageData<ArticleResponse> listAdmin(int page, int limit, ArticleCategory category);

    ArticleResponse get(String slug);

    ArticleResponse create(ArticleRequest request);

    ArticleResponse update(String slug, ArticleRequest request);

    void delete(String slug);
}
