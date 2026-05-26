package com.knowflow.backend.knowledgebase.dto.request;

import lombok.Data;

@Data
// 创建知识库请求实体类
public class CreateKnowledgeBaseRequest {
    private String name;
    private String description;
    private Boolean featured;
    private String themeId;
}
