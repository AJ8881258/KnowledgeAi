package com.knowflow.backend.settings.entity;

import lombok.Data;

import java.time.OffsetDateTime;


/**
 * 用户RAG设置
 *
 */
@Data
public class UserRagSettings {
    private Long userId;//用户ID
    private Integer topK; // 控制检索阶段最多取多少个 chunk
    private Integer maxContextChunks; //控制真正进入 prompt 和引用来源保存的 chunk 数量
    private Double temperature;//控制生成文本的随机性
    /**
     * Retrieval strategy used by search and Chat RAG.
     * HYBRID keeps Stage 18 semantic + full-text ranking; FULLTEXT skips embedding calls.
     */
    private String retrievalMode;
    /**
     * Hybrid ranking weight for vector similarity. Must be paired with fulltextWeight so the sum is 1.
     */
    private Double semanticWeight;
    /**
     * Hybrid ranking weight for PostgreSQL full-text score. Must be paired with semanticWeight so the sum is 1.
     */
    private Double fulltextWeight;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
