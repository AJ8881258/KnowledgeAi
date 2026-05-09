package com.knowflow.backend.knowledgebase;

import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

// Repository 是数据访问层。这里使用 MyBatis Mapper 手写 SQL 查询数据库。
@Mapper
public interface KnowledgeBaseRepository {

        @Select("""
                        SELECT id, name, description, status, created_by, created_at, updated_at
                        FROM knowledge_bases
                        ORDER BY id
                        """)
        List<KnowledgeBase> findAll();

        @Select("""
                        SELECT id, name, description, status, created_by, created_at, updated_at
                        FROM knowledge_bases
                        WHERE id = #{id}
                        """)
        Optional<KnowledgeBase> findById(Long id);
}
