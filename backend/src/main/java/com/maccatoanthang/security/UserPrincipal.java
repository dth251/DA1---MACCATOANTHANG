package com.maccatoanthang.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.security.Principal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPrincipal implements Principal {

    private Long userId;

    private String phone;

    @Override
    public String getName() {
        return this.phone;
    }

    public Long userId() {
        return this.userId;
    }

    public Long customerId() {
        return this.userId;
    }

    public String phone() {
        return this.phone;
    }
}
