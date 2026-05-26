package com.knowflow.backend.knowledgebase.entity;

import java.time.OffsetDateTime;

import lombok.Data;

/**
 * 知识库实体类
 */
@Data
public class KnowledgeBase {
    private Long id;
    private String name;// 知识库名称
    private String description;// 知识库描述
    private String status;// 知识库状态
    private Boolean featured;//是否精选
    private String themeId;// 主题 ID
    private Long createdBy;// 创建人 ID
    private OffsetDateTime createdAt;// 创建时间
    private OffsetDateTime updatedAt;// 更新时间

    private String accessRole;// 访问角色
    private Boolean ownedByMe;// 是否由我创建
    private Boolean sharedWithMe;// 是否与我共享
}
