package com.maccatoanthang.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class RegisterRequest {

    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
    @Pattern(regexp = "^[a-zA-Z0-9_.]{3,50}$", message = "Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới hoặc dấu chấm")
    private String username;

    @Size(max = 120, message = "Họ tên không được vượt quá 120 ký tự")
    private String name;

    @Size(max = 120, message = "Họ tên không được vượt quá 120 ký tự")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "0[0-9]{9}", message = "Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0")
    private String phone;

    @Email(message = "Email không đúng định dạng")
    @Size(max = 254, message = "Email không được vượt quá 254 ký tự")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, max = 72, message = "Mật khẩu phải từ 6 đến 72 ký tự")
    private String password;

    public RegisterRequest(String name, String phone, String email, String password) {
        this.name = name;
        this.fullName = name;
        this.phone = phone;
        this.email = email;
        this.password = password;
    }

    public RegisterRequest(String username, String name, String phone, String email, String password) {
        this.username = username;
        this.name = name;
        this.fullName = name;
        this.phone = phone;
        this.email = email;
        this.password = password;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
        if (this.name == null || this.name.isBlank()) {
            this.name = fullName;
        }
    }

    public void setName(String name) {
        this.name = name;
        if (this.fullName == null || this.fullName.isBlank()) {
            this.fullName = name;
        }
    }

    public String username() {
        if (this.username != null && !this.username.isBlank()) {
            return this.username.trim();
        }
        return null;
    }

    public String name() {
        if (this.name != null && !this.name.isBlank()) {
            return this.name.trim();
        }
        if (this.fullName != null && !this.fullName.isBlank()) {
            return this.fullName.trim();
        }
        return null;
    }

    public String phone() {
        return this.phone;
    }

    public String email() {
        return this.email;
    }

    public String password() {
        return this.password;
    }

    @JsonIgnore
    @AssertTrue(message = "Họ tên không được để trống")
    public boolean isNameProvided() {
        return (this.name != null && !this.name.isBlank()) || (this.fullName != null && !this.fullName.isBlank());
    }
}
