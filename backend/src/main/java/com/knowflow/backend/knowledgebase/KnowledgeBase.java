package com.knowflow.backend.knowledgebase;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

// @Entity 表示这是一个 JPA 实体类
// 它会映射到数据库中的一张表
@Entity
// 指定数据库表名
// Java 类名是 KnowledgeBase
// 数据库表名是 knowledge_bases
@Table(name = "knowledge_bases")
public class KnowledgeBase {
    @Id
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    // getter：获取属性值
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getStatus() {
        return status;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
