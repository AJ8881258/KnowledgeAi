package com.knowflow.backend.auth;

public class LoginResponse {

    // Private
    private Long id;
    private String username;
    private String role;
    private String tokenType;
    private String accessToken;

    // Public Methods
    public LoginResponse(Long id, String username, String role, String tokenType, String accessToken) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.tokenType = tokenType;
        this.accessToken = accessToken;
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

    public String getTokenType() {
        return tokenType;
    }

    public String getAccessToken() {
        return accessToken;
    }

}
