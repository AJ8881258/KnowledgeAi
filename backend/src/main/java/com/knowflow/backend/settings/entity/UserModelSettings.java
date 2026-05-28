package com.knowflow.backend.settings.entity;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class UserModelSettings {
    private Long userId;
    private String baseUrl;
    private String encryptedApiKey; // 保存加密后的 API Key，接口响应只返回是否已配置。
    private String model;
    private Integer timeoutSeconds;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
