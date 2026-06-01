package com.knowflow.backend.auth.dto.request;

import lombok.Data;

/**
 * Request body for selecting one of the built-in avatar presets.
 *
 * <p>avatarPresetId must be one of the server-maintained preset ids. The backend
 * validates this allow-list so clients cannot persist arbitrary CSS/image ids.</p>
 */
@Data
public class UpdateAvatarPresetRequest {
    private String avatarPresetId;
}
