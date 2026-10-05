package com.maccatoanthang.model.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum RequestType {
    ORDER,
    CONSULT,
    CONTACT;

    @JsonValue
    public String jsonValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}
