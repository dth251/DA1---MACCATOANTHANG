package com.maccatoanthang.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;

    private String refreshToken;

    private String tokenType;

    private long expiresIn;

    private String role;

    private UserResponse user;

    public AuthResponse(String accessToken, String tokenType, long expiresIn, String role, UserResponse user) {
        this(accessToken, null, tokenType, expiresIn, role, user);
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminUser {

        private String username;

        private String role;

        public String username() {
            return this.username;
        }

        public String role() {
            return this.role;
        }
    }

    @JsonIgnore
    public String token() {
        return this.accessToken;
    }

    public String accessToken() {
        return this.accessToken;
    }

    public String refreshToken() {
        return this.refreshToken;
    }

    public String tokenType() {
        return this.tokenType;
    }

    public long expiresIn() {
        return this.expiresIn;
    }

    public String role() {
        return this.role;
    }

    public UserResponse user() {
        return this.user;
    }

    public UserResponse customer() {
        return this.user;
    }
}
