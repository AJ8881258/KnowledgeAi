package com.knowflow.backend.user.entity;

import java.time.OffsetDateTime;

public class User {
    private Long id;
    private String username;
    private String passwordHash;
    private String role;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // Getter
    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getRole() {
        return role;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    // Setter
    public void setUsername(String username) {
        this.username = username;
    }

    public void setPasswordHash(String password) {
        this.passwordHash = password;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
