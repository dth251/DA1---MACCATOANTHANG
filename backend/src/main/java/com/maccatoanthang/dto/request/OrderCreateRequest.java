package com.maccatoanthang.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreateRequest {

    @Valid
    private UserInput user;

    @NotEmpty(message = "Danh sách sản phẩm không được để trống")
    @Size(max = 100, message = "Danh sách sản phẩm không được vượt quá 100 loại")
    private List<@NotNull @Valid ItemInput> items;

    @NotNull(message = "Phí giao hàng không được để trống")
    @Min(value = 0, message = "Phí giao hàng không được âm")
    @Max(value = 100000000, message = "Phí giao hàng tối đa 100 triệu")
    private Integer shippingFee;

    @Size(max = 10000, message = "Ghi chú không được vượt quá 10.000 ký tự")
    private String note;

    public UserInput user() {
        return this.user;
    }

    public UserInput customer() {
        return this.user;
    }

    public List<ItemInput> items() {
        return this.items;
    }

    public Integer shippingFee() {
        return this.shippingFee;
    }

    public String note() {
        return this.note;
    }
}
