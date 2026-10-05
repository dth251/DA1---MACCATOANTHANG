package com.maccatoanthang.dto.response;

import com.maccatoanthang.model.enums.ArticleCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleResponse {

    private String slug;

    private String title;

    private String body;

    private ArticleCategory category;

    private String label;

    private String image;

    private String description;

    private int sortOrder;

    @Builder.Default
    private boolean published = true;

    public boolean isPublished() {
        return this.published;
    }

    public String slug() {
        return this.slug;
    }

    public String title() {
        return this.title;
    }

    public String body() {
        return this.body;
    }

    public ArticleCategory category() {
        return this.category;
    }

    public String label() {
        return this.label;
    }

    public String image() {
        return this.image;
    }

    public String description() {
        return this.description;
    }

    public int sortOrder() {
        return this.sortOrder;
    }
}
