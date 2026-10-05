package com.maccatoanthang.mapper;

import com.maccatoanthang.dto.response.UserResponse;
import com.maccatoanthang.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(com.maccatoanthang.model.ContactSnapshot contact, User owner) {
        if (contact == null) {
            return toResponse(owner); // Compatibility for records created before snapshot migration.
        }
        return UserResponse.builder()
                .id(owner == null ? null : owner.getId())
                .role(owner == null ? com.maccatoanthang.model.enums.UserRole.GUEST : owner.getRole())
                .name(contact.getName()).phone(contact.getPhone())
                .email(contact.getEmail()).address(contact.getAddress()).build();
    }

    public UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }

        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .phone(user.getPhone())
                .email(user.getEmail())
                .role(user.getRole())
                .address(user.getAddress())
                .build();
    }
}
