package com.knowflow.backend.auth.dto.response;

import lombok.Data;

@Data
public class UserResponse {

    private Long id;
    private String username;
    private String role;

    public UserResponse(Long id, String username, String role) {
        this.id = id;
        this.username = username;
        this.role = role;
    }
}
