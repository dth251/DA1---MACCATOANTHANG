package com.maccatoanthang.dto.response;

import com.maccatoanthang.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;

    private String name;

    private String username;

    private String phone;

    private String email;

    private UserRole role;

    private String address;

    public Long id() {
        return this.id;
    }

    public String name() {
        return this.name;
    }

    public String username() {
        return this.username;
    }

    public String phone() {
        return this.phone;
    }

    public String email() {
        return this.email;
    }

    public UserRole role() {
        return this.role;
    }

    public String address() {
        return this.address;
    }
}
