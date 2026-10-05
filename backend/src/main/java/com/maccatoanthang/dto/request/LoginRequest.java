package com.maccatoanthang.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    private String username;

    private String phone;

    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(max = 200, message = "Mật khẩu không được vượt quá 200 ký tự")
    private String password;

    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String username() {
        if (this.username != null && !this.username.isBlank()) {
            return this.username.trim();
        }
        if (this.phone != null && !this.phone.isBlank()) {
            return this.phone.trim();
        }
        return null;
    }

    public String password() {
        return this.password;
    }

    @JsonIgnore
    @AssertTrue(message = "Tên đăng nhập hoặc số điện thoại không được để trống")
    public boolean isAccountProvided() {
        return (username != null && !username.isBlank())
                || (phone != null && !phone.isBlank());
    }
}
