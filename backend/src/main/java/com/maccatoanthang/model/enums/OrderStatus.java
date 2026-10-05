package com.maccatoanthang.model.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPING,
    COMPLETED,
    CANCELLED;

    @JsonValue
    public String jsonValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}
