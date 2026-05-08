package com.knowflow.backend.auth;

public class LoginResponse {

    // Private
    private Long id;
    private String username;
    private String role;

    // Public Methods
    public LoginResponse(Long id, String username, String role) {
        this.id = id;
        this.username = username;
        this.role = role;
    }

    // Getter
    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }

}
