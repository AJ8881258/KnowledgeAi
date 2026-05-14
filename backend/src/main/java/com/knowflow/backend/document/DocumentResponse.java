package com.knowflow.backend.document;

import java.time.OffsetDateTime;

import lombok.Data;

@Data
public class DocumentResponse {
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
    private Long chunkCount;

    // 构造函数
    public DocumentResponse(
            Document document,
            Long chunkCount) {
        this.id = document.getId();
        this.knowledgeBaseId = document.getKnowledgeBaseId();
        this.originalFilename = document.getOriginalFilename();
        this.contentType = document.getContentType();
        this.sizeBytes = document.getSizeBytes();
        this.status = document.getStatus();
        this.errorMessage = document.getErrorMessage();
        this.createdBy = document.getCreatedBy();
        this.createdAt = document.getCreatedAt();
        this.updatedAt = document.getUpdatedAt();
        this.chunkCount = chunkCount;
    }
}
