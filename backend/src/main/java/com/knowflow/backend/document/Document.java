package com.knowflow.backend.document;

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
    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
