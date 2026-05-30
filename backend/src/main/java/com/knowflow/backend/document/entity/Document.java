package com.knowflow.backend.document.entity;

import java.time.OffsetDateTime;

import lombok.Data;

@Data
// 文章实体类
public class Document {
    private Long id;
    private Long knowledgeBaseId;
    private String originalFilename;
    private String contentType;
    private Long sizeBytes;
    private String status;
    private String errorMessage;
    /**
     * 文档级摘要。它只用于文档详情展示，不参与检索，也不会写入 Chat 引用来源。
     */
    private String summary;
    private OffsetDateTime summaryUpdatedAt;
    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
