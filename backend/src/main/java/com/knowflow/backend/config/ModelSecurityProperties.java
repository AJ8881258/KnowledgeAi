package com.knowflow.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "knowflow.model")
public class ModelSecurityProperties {
    private String secretKey; // 用户模型 API Key 的加密密钥，生产环境必须从环境变量读取。
}
