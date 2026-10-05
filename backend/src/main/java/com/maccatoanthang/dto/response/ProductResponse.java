package com.maccatoanthang.dto.response;

import com.maccatoanthang.model.enums.ProductCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {

    private String id;

    private String name;

    private ProductCategory category;

    private String categoryName;

    private String image;

    private String weight;

    private Integer price;

    private String badge;

    private String description;

    private String ingredients;

    private Integer stock;

    private boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public String id() {
        return this.id;
    }

    public String name() {
        return this.name;
    }

    public ProductCategory category() {
        return this.category;
    }

    public String categoryName() {
        return this.categoryName;
    }

    public String image() {
        return this.image;
    }

    public String weight() {
        return this.weight;
    }

    public Integer price() {
        return this.price;
    }

    public String badge() {
        return this.badge;
    }

    public String description() {
        return this.description;
    }

    public String ingredients() {
        return this.ingredients;
    }

    public Integer stock() {
        return this.stock;
    }

    public boolean active() {
        return this.active;
    }

    public LocalDateTime createdAt() {
        return this.createdAt;
    }

    public LocalDateTime updatedAt() {
        return this.updatedAt;
    }
}
