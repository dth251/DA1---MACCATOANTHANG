package com.maccatoanthang.exception;

/**
 * Thrown when an authenticated user attempts to access forbidden resources (HTTP 403 Forbidden).
 */
public class ForbiddenException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public ForbiddenException(String message) {
        super(message);
    }
}
