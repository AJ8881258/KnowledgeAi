package com.knowflow.backend.user.entity;

import lombok.Data;

import java.time.OffsetDateTime;


@Data
public class User {
    private Long id;
    private String username;
    private String passwordHash;
    private String role;
    private String email;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
