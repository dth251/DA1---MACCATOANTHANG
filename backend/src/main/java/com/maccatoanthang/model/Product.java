package com.maccatoanthang.model;

import com.maccatoanthang.model.enums.ProductCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;

@Entity
@Table(
        name = "product",
        indexes = {
                @Index(name = "idx_product_category", columnList = "category")
        }
)
@Check(constraints = "price between 1000 and 100000000 and mod(price, 1000) = 0 and (stock is null or stock between 0 and 1000000)")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product extends AuditedEntity {

    @Id
    @Column(length = 80)
    private String id;

    @jakarta.persistence.Version
    @Column(nullable = false)
    private Long version;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductCategory category;

    @Column(length = 100)
    private String categoryName;

    private String image;

    @Column(length = 80)
    private String weight;

    @Column(nullable = false)
    private Integer price;

    @Column(length = 120)
    private String badge;

    @Column(columnDefinition = "text")
    private String description;

    private String ingredients;

    private Integer stock;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
