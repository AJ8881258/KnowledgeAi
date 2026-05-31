package com.knowflow.backend.document.dto.response;

import lombok.Data;

// 搜索结果响应
@Data
public class SearchResultResponse {
    private Long chunkId;
    private Long documentId;
    private String documentName;
    private Integer chunkIndex;
    private String content;
    /**
     * Backward-compatible relevance score. In Stage 18 it mirrors hybridScore
     * when semantic retrieval is active and fulltextScore when it falls back.
     */
    private Double score;
    private Double hybridScore;
    private Double fulltextScore;
    private Double semanticScore;
    private String retrievalMode;
}
