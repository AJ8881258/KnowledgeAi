package com.knowflow.backend.knowledgebase.dto.request;

import lombok.Data;

/**
 * 更新知识库成员请求体
 */
@Data
public class UpdateKnowledgeBaseMemberRequest {
    private String role;
}
