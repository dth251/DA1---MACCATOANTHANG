package com.maccatoanthang.mapper;

import com.maccatoanthang.dto.request.ProductRequest;
import com.maccatoanthang.dto.response.ProductResponse;
import com.maccatoanthang.model.Product;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    public ProductResponse toResponse(Product product) {
        if (product == null) {
            return null;
        }

        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .category(product.getCategory())
                .categoryName(product.getCategoryName())
                .image(product.getImage())
                .weight(product.getWeight())
                .price(product.getPrice())
                .badge(product.getBadge())
                .description(product.getDescription())
                .ingredients(product.getIngredients())
                .stock(product.getStock())
                .active(product.isActive())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    public Product toEntity(ProductRequest request) {
        if (request == null) {
            return null;
        }

        return Product.builder()
                .id(request.getId())
                .name(request.getName())
                .category(request.getCategory())
                .categoryName(request.getCategoryName())
                .image(request.getImage())
                .weight(request.getWeight())
                .price(request.getPrice())
                .badge(request.getBadge())
                .description(request.getDescription())
                .ingredients(request.getIngredients())
                .stock(request.getStock())
                .active(request.getActive() == null || request.getActive())
                .build();
    }

    public void update(Product product, ProductRequest request) {
        if (product == null || request == null) {
            return;
        }

        product.setName(request.getName());
        product.setCategory(request.getCategory());
        product.setCategoryName(request.getCategoryName());
        product.setImage(request.getImage());
        product.setWeight(request.getWeight());
        product.setPrice(request.getPrice());
        product.setBadge(request.getBadge());
        product.setDescription(request.getDescription());
        product.setIngredients(request.getIngredients());
        product.setStock(request.getStock());
        product.setActive(request.getActive() == null || request.getActive());
    }
}
