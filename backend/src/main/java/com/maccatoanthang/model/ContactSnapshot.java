package com.maccatoanthang.model;

import com.maccatoanthang.dto.request.UserInput;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Contact details at submission time; never an assertion of account ownership. */
@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ContactSnapshot {
    @Column(name = "contact_name", length = 120)
    private String name;
    @Column(name = "contact_phone", length = 10)
    private String phone;
    @Column(name = "contact_email", length = 254)
    private String email;
    @Column(name = "contact_address", length = 500)
    private String address;

    public static ContactSnapshot from(UserInput input, User user) {
        if (input != null) {
            return new ContactSnapshot(input.name(), input.phone(), input.email(), input.fullAddress());
        }
        if (user == null) {
            throw new com.maccatoanthang.exception.BadRequestException("Thông tin liên hệ không được để trống");
        }
        return new ContactSnapshot(user.getName(), user.getPhone(), user.getEmail(), user.getAddress());
    }
}
