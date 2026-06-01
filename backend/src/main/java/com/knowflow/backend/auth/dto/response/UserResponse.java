package com.knowflow.backend.auth.dto.response;

import lombok.Data;

@Data
public class UserResponse {
    public enum AvatarSource {
        UPLOAD,
        PRESET,
        NONE
    }

    private Long id;
    private String username;
    private String role;
    private String email;
    private String phone;
    /**
     * Short-lived signed URL for uploaded avatars only. Preset avatars are rendered by the frontend
     * from avatarPresetId and never require an OSS URL.
     */
    private String avatarUrl;
    private boolean avatarConfigured;
    /**
     * Whether backend OSS avatar storage is configured. This tells the Settings UI whether
     * upload is available without exposing endpoint, bucket, object key, AccessKey or Secret.
     */
    private boolean avatarStorageConfigured;
    private AvatarSource avatarSource;
    private String avatarPresetId;

    public UserResponse(Long id, String username, String role, String email) {
        this(id, username, role, email, null, null, false, false, AvatarSource.NONE, null);
    }

    public UserResponse(Long id, String username, String role, String email, String avatarUrl, boolean avatarConfigured) {
        this(id, username, role, email, null, avatarUrl, avatarConfigured, false,
                avatarConfigured ? AvatarSource.UPLOAD : AvatarSource.NONE,
                null);
    }

    public UserResponse(
            Long id,
            String username,
            String role,
            String email,
            String phone,
            String avatarUrl,
            boolean avatarConfigured,
            boolean avatarStorageConfigured,
            AvatarSource avatarSource,
            String avatarPresetId
    ) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.email = email;
        this.phone = phone;
        this.avatarUrl = avatarUrl;
        this.avatarConfigured = avatarConfigured;
        this.avatarStorageConfigured = avatarStorageConfigured;
        this.avatarSource = avatarSource;
        this.avatarPresetId = avatarPresetId;
    }
}
