package com.maccatoanthang.exception;

/**
 * Thrown when a resource already exists or a data conflict occurs (HTTP 409 Conflict).
 */
public class ConflictException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public ConflictException(String message) {
        super(message);
    }
}
