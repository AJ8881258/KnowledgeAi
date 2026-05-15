package com.knowflow.backend.document;

import lombok.Data;
import java.util.List;

// 搜索文档响应
@Data
public class SearchDocumentResponse {
    private String query;
    private List<SearchResultResponse> results;

    public SearchDocumentResponse(String query,List<SearchResultResponse> results){
        this.query = query;
        this.results = results;
    }

}
