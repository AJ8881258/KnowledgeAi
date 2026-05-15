package com.knowflow.backend.document;

import lombok.Data;

// 搜索结果响应
@Data
public class SearchResultResponse {
    private Long chunkId;
    private Long documentId;
    private String documentName;
    private Integer chunkIndex;
    private String content;
    private Double score;
}
