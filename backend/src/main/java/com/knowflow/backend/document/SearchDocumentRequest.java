package com.knowflow.backend.document;

import lombok.Data;

// 搜索文档请求
@Data
public class SearchDocumentRequest {
    private String query;
    private Integer limit;

}
