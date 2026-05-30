package com.knowflow.backend.document.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

import com.knowflow.backend.document.entity.Document;
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
    private String summary;
    private OffsetDateTime summaryUpdatedAt;
    private Long chunkCount;
    private Long charCount;
    private Double averageChunkLength;
    private Integer minChunkLength;
    private Integer maxChunkLength;
    private List<String> qualityWarnings;
    /**
     * Whether the backend has a saved source that can be used for true reprocess.
     * The actual bytes/text are intentionally not returned.
     */
    private Boolean sourceStored;
    /**
     * Whether the reprocess endpoint has any usable source: original bytes, extracted source text,
     * or existing chunks for old Stage 15 documents.
     */
    private Boolean reprocessAvailable;

    // 构造函数
    public DocumentResponse(
            Document document,
            Long chunkCount) {
        this(document, new DocumentQualityResponse(
                document.getId(),
                document.getStatus(),
                chunkCount,
                null,
                null,
                null,
                null,
                List.of(),
                document.getUpdatedAt()));
    }

    /**
     * @param document 文档基础记录，包含处理状态、错误和可选摘要
     * @param quality 当前文档 chunks 计算出的质量指标；这些指标只用于展示，不影响检索排序
     */
    public DocumentResponse(Document document, DocumentQualityResponse quality) {
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
        this.summary = document.getSummary();
        this.summaryUpdatedAt = document.getSummaryUpdatedAt();
        this.chunkCount = quality.getChunkCount();
        this.charCount = quality.getCharCount();
        this.averageChunkLength = quality.getAverageChunkLength();
        this.minChunkLength = quality.getMinChunkLength();
        this.maxChunkLength = quality.getMaxChunkLength();
        this.qualityWarnings = quality.getQualityWarnings();
        this.sourceStored = hasStoredSource(document);
        this.reprocessAvailable = this.sourceStored || (this.chunkCount != null && this.chunkCount > 0);
    }

    private boolean hasStoredSource(Document document) {
        return Boolean.TRUE.equals(document.getSourceBytesStored())
                || Boolean.TRUE.equals(document.getSourceTextStored())
                || (document.getSourceBytes() != null && document.getSourceBytes().length > 0)
                || (document.getSourceText() != null && !document.getSourceText().isBlank());
    }
}
