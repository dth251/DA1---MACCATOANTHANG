package com.maccatoanthang.util;

import com.maccatoanthang.exception.BadRequestException;

import java.nio.charset.StandardCharsets;

public final class Passwords {

    private Passwords() {}

    public static void validate(String password) {
        if (password != null && password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("Mật khẩu không được vượt quá 72 byte UTF-8");
        }
    }
}
