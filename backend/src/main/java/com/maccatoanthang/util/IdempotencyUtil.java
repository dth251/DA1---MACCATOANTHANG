package com.maccatoanthang.util;

import java.util.UUID;

public final class IdempotencyUtil {

    private IdempotencyUtil() {}

    public static String generateKey() {
        return UUID.randomUUID().toString();
    }

    public static boolean isValid(String key) {
        return key != null && !key.isBlank() && key.length() <= 128;
    }
}
