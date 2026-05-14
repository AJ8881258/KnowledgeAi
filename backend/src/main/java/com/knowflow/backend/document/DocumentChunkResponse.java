package com.knowflow.backend.document;

import java.time.OffsetDateTime;

import lombok.Data;

@Data

public class DocumentChunkResponse {

    private Integer chunkIndex;
    private String content;
    private Integer charCount;
    private OffsetDateTime createdAt;

    public DocumentChunkResponse(DocumentChunk documentChunk) {
        this.chunkIndex = documentChunk.getChunkIndex();
        this.content = documentChunk.getContent();
        this.charCount = documentChunk.getCharCount();
        this.createdAt = documentChunk.getCreatedAt();
    }
}
