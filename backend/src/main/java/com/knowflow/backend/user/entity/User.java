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
     * Optional profile contact phone. It is display/contact metadata only: not unique,
     * not used for login, and nullable when the user has not configured contact details.
     */
    private String phone;
    /**
     * OSS object key for the user's avatar. Public APIs never return this value directly;
     * AuthService converts it into a short-lived signed URL for frontend display.
     */
    private String avatarObjectKey;
    /**
     * Built-in avatar preset chosen by the user. It is mutually exclusive with avatarObjectKey:
     * selecting a preset clears the uploaded object key, and uploading a file clears this preset.
     */
    private String avatarPresetId;
    private OffsetDateTime avatarUpdatedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
