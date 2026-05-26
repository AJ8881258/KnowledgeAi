package com.knowflow.backend.knowledgebase.dto.request;


import lombok.Data;

/**
 * 添加知识库成员请求体
 */
@Data
public class AddKnowledgeBaseMemberRequest {
    private String username;
    private String role;
}
