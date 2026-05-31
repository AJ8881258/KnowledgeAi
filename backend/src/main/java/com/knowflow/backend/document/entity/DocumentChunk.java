package com.knowflow.backend.document.entity;

import java.time.OffsetDateTime;

import lombok.Data;

// 文章分块实体类
@Data
public class DocumentChunk {
    private Long id;
    private Long documentId;
    private Long knowledgeBaseId;
    private Integer chunkIndex;
    private String content;
    private Integer charCount;
    /**
     * Per-chunk embedding state for semantic retrieval fallback diagnostics.
     */
    private String embeddingStatus;
    private OffsetDateTime createdAt;

}
