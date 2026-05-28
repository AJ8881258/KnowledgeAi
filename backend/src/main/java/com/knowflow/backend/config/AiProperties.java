package com.knowflow.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AI 配置属性
 * 从 application.yaml 中读取（ConfigurationProperties 注解指定前缀为 knowflow.ai）
 */
@Data
@ConfigurationProperties(prefix = "knowflow.ai")
public class AiProperties {
    private String baseUrl;
    private String apiKey;
    private String model;
    private Integer timeoutSeconds = 60;
}
