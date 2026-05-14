package com.knowflow.backend.document;

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
    private OffsetDateTime createdAt;

}
