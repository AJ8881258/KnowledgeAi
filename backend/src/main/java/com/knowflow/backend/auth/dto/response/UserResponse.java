package com.knowflow.backend.auth.dto.response;

import lombok.Data;

@Data
public class UserResponse {

    private Long id;
    private String username;
    private String role;
    private String email;
    private String avatarUrl;
    private boolean avatarConfigured;

    public UserResponse(Long id, String username, String role, String email) {
        this(id, username, role, email, null, false);
    }

    public UserResponse(Long id, String username, String role, String email, String avatarUrl, boolean avatarConfigured) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.email = email;
        this.avatarUrl = avatarUrl;
        this.avatarConfigured = avatarConfigured;
    }
}
