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
    /**
     * OpenAI-compatible embedding model used for Stage 18 semantic retrieval.
     * Chat model selection remains user configurable; embeddings stay backend-configured
     * because they are an indexing concern and must be stable across document chunks.
     */
    private String embeddingModel;
    private Integer timeoutSeconds = 60;
}
