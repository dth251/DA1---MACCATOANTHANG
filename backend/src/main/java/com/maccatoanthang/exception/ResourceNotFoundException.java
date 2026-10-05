package com.maccatoanthang.exception;

/**
 * Thrown when a requested entity is not found in the database (HTTP 404 Not Found).
 */
public class ResourceNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
