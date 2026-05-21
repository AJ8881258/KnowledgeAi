package com.knowflow.backend.settings.dto.response;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ModelSettingsResponse {
    private boolean configured;
    private String mode;
    private String model;
    private boolean baseUrlConfigured;
    private boolean apiKeyConfigured;
    private Integer timeoutSeconds;
    private boolean editable;
}
