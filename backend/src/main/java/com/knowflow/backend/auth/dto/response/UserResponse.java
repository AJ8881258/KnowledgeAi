package com.knowflow.backend.auth.dto.response;

import lombok.Data;

@Data
public class UserResponse {

    private Long id;
    private String username;
    private String role;
    private String email;

    public UserResponse(Long id, String username, String role, String email) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.email = email;
    }
}
