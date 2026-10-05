package com.maccatoanthang.exception;

/**
 * Thrown when token or credentials are missing, invalid, or expired (HTTP 401 Unauthorized).
 */
public class UnauthorizedException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public UnauthorizedException(String message) {
        super(message);
    }
}
