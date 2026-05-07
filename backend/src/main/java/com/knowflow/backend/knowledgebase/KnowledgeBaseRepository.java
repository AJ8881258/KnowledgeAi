package com.knowflow.backend.knowledgebase;

import org.springframework.data.jpa.repository.JpaRepository;

// Repository 是数据访问层
// JpaRepository<KnowledgeBase, Long> 的意思是：
// 1. 这个 Repository 操作 KnowledgeBase 实体
// 2. 这个实体的主键类型是 Long
public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, Long> {
}
