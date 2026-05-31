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
     * Stage 18 semantic indexing state for this document.
     * Text indexing can still be INDEXED when this value is FAILED or SKIPPED.
     */
    private String embeddingStatus;
    private String embeddingErrorMessage;
    private OffsetDateTime embeddingUpdatedAt;
    /**
     * 文档级摘要。它只用于文档详情展示，不参与检索，也不会写入 Chat 引用来源。
     */
    private String summary;
    private OffsetDateTime summaryUpdatedAt;
    /**
     * 原始上传文件字节。阶段 16 用它支持真正失败重试：即使首次解析没有生成 chunks，
     * 后续也能重新按文件类型提取文本。该字段只供后端处理使用，不能返回给前端。
     */
    private byte[] sourceBytes;
    private Boolean sourceBytesStored;
    /**
     * 最近一次成功解析出的规范化文本。它可作为二级重试来源，也便于避免只依赖 chunks
     * 反推原文；该字段同样不对外暴露。
     */
    private String sourceText;
    private Boolean sourceTextStored;
    private OffsetDateTime sourceTextUpdatedAt;
    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
