package com.knowflow.backend.knowledgebase.entity;


import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 知识库成员实体类
 */
@Data
public class KnowledgeBaseMember {
    private  Long id;
    private Long knowledgeBaseId;
    private Long userId;
    private String username;
    private String role;
    private OffsetDateTime updatedAt;
    private OffsetDateTime createdAt;
}
