package com.maccatoanthang.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.stream.Collectors;
import java.util.stream.Stream;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInput {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 120, message = "Họ tên không được vượt quá 120 ký tự")
    private String name;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "0[0-9]{9}", message = "Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0")
    private String phone;

    @Email(message = "Email không đúng định dạng")
    @Size(max = 254, message = "Email không được vượt quá 254 ký tự")
    private String email;

    @Size(max = 300, message = "Địa chỉ không được vượt quá 300 ký tự")
    private String address;

    @Size(max = 90, message = "Phường/Xã không được vượt quá 90 ký tự")
    private String ward;

    @Size(max = 90, message = "Tỉnh/Thành phố không được vượt quá 90 ký tự")
    private String province;

    public String fullAddress() {
        return Stream.of(address, ward, province)
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining(", "));
    }

    public String name() {
        return this.name;
    }

    public String phone() {
        return this.phone;
    }

    public String email() {
        return this.email;
    }

    public String address() {
        return this.address;
    }

    public String ward() {
        return this.ward;
    }

    public String province() {
        return this.province;
    }
}
