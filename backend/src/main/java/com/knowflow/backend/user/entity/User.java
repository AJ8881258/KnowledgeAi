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
    /**
     * OSS object key for the user's avatar. Public APIs never return this value directly;
     * AuthService converts it into a short-lived signed URL for frontend display.
     */
    private String avatarObjectKey;
    private OffsetDateTime avatarUpdatedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
