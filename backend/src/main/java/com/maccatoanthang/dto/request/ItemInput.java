package com.maccatoanthang.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemInput {

    @NotBlank(message = "Mã sản phẩm không được để trống")
    @Pattern(regexp = "[a-zA-Z0-9-]{1,80}", message = "Mã sản phẩm chỉ gồm chữ, số và dấu gạch ngang (tối đa 80 ký tự)")
    private String id;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng tối thiểu là 1")
    @Max(value = 99, message = "Số lượng tối đa là 99")
    private Integer quantity;

    public String id() {
        return this.id;
    }

    public Integer quantity() {
        return this.quantity;
    }
}
