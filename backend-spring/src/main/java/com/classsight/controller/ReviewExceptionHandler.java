package com.classsight.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ReviewExceptionHandler {

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, String> forbidden(Exception exception) {
        return response("FORBIDDEN", exception);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> badRequest(Exception exception) {
        return response("BAD_REQUEST", exception);
    }

    private Map<String, String> response(String error, Exception exception) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("error", error);
        body.put("message", exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage());
        return body;
    }
}
