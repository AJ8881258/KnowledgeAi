package com.knowflow.backend.settings.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserPreferenceResponse {
    private String language;
    private String timezone;
}
