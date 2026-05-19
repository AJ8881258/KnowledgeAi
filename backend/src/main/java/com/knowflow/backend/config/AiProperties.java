package com.knowflow.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "knowflow.ai")
public class AiProperties {
    private String baseUrl;
    private String apiKey;
    private String model;
    private Integer timeoutSeconds = 60;
}
