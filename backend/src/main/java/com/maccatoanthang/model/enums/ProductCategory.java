package com.maccatoanthang.model.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum ProductCategory {
    SHELL,
    KERNEL,
    GIFT;

    @JsonValue
    public String jsonValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}
