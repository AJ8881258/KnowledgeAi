package com.knowflow.backend.settings.dto.request;

import lombok.Data;

@Data
public class UpdateUserPreferenceRequest {
    private String language;
    private String timezone;
}
