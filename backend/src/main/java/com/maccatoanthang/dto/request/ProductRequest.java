package com.maccatoanthang.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.maccatoanthang.model.enums.ProductCategory;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotBlank(message = "Mã sản phẩm không được để trống")
    @Pattern(regexp = "[a-zA-Z0-9-]{1,80}", message = "Mã sản phẩm chỉ gồm chữ, số và gạch ngang (tối đa 80 ký tự)")
    private String id;

    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(max = 120, message = "Tên sản phẩm không được vượt quá 120 ký tự")
    private String name;

    @NotNull(message = "Danh mục không được để trống")
    private ProductCategory category;

    @Size(max = 100, message = "Tên danh mục không được vượt quá 100 ký tự")
    private String categoryName;

    @Size(max = 255, message = "Đường dẫn ảnh không được vượt quá 255 ký tự")
    private String image;

    @Size(max = 80, message = "Khối lượng không được vượt quá 80 ký tự")
    private String weight;

    @NotNull(message = "Giá sản phẩm không được để trống")
    @Min(value = 1000, message = "Giá sản phẩm tối thiểu là 1.000 VNĐ")
    @Max(value = 100000000, message = "Giá sản phẩm tối đa là 100.000.000 VNĐ")
    private Integer price;

    @Size(max = 120, message = "Huy hiệu/nhãn không được vượt quá 120 ký tự")
    private String badge;

    @Size(max = 20000, message = "Mô tả sản phẩm không được vượt quá 20.000 ký tự")
    private String description;

    @Size(max = 255, message = "Thành phần không được vượt quá 255 ký tự")
    private String ingredients;

    @Min(value = 0, message = "Tồn kho không được âm")
    @Max(value = 1000000, message = "Tồn kho tối đa 1.000.000")
    private Integer stock;

    private Boolean active;

    @JsonIgnore
    @AssertTrue(message = "Giá phải chia hết cho 1000")
    public boolean isPriceMultipleOfThousand() {
        return price == null || price % 1000 == 0;
    }

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

    public Boolean active() {
        return this.active;
    }
}
