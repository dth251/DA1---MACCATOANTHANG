package com.maccatoanthang.exception;

/**
 * Thrown when client input or business logic validation fails (HTTP 400 Bad Request).
 */
public class BadRequestException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public BadRequestException(String message) {
        super(message);
    }
}
