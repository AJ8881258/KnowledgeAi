package com.knowflow.backend.common.dto.response;


import lombok.Data;

@Data
public class ApiErrorResponse {

    private String message;

    public ApiErrorResponse(String message) {
        this.message = message;
    }
}
