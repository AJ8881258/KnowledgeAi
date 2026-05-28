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
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
