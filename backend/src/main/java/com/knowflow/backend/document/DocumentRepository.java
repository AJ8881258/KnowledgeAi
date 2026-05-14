package com.knowflow.backend.document;

import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

// Repository 是数据访问层。这里沿用项目现有风格，用 MyBatis 注解直接写 SQL。

@Mapper
public interface DocumentRepository {

    // 插入文档
    @Insert("""
            insert into documents (
            knowledge_base_id,
            original_filename,
            content_type,
            size_bytes,
            status,
            error_message,
            created_by
            )
            values (
            #{knowledgeBaseId},
            #{originalFilename},
            #{contentType},
            #{sizeBytes},
            #{status},
            #{errorMessage},
            #{createdBy}
            )
            """)
    // 插入文档时，返回自动生成的 ID
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int insert(Document document);

    // 查询文档
    @Select("""
                select
                id,knowledge_base_id,original_filename,content_type,size_bytes,status,error_message,created_by,created_at,updated_at
                from documents where
                knowledge_base_id = #{knowledgeBaseId} and created_by = #{userId}
                order by id desc
            """)
    List<Document> findAllByKnowledgeBaseIdAndCreatedBy(
            @Param("knowledgeBaseId") Long knowledgeBaseId,
            @Param("userId") Long userId);

    // 根据 ID 查询文档
    @Select("""
                select
                id,knowledge_base_id,original_filename,content_type,size_bytes,status,error_message,created_by,created_at,updated_at
                from documents where
                id = #{id} and created_by = #{userId}
            """)
    Optional<Document> findByIdAndCreatedBy(@Param("id") Long id, @Param("userId") Long userId);

    // 更新文档状态
    @Update("""
            update documents set
            status = #{status},
            error_message = #{errorMessage},
            updated_at = now()
            where id =#{id} and created_by = #{userId}
            """)
    int updateStatusByIdAndCreatedBy(
            @Param("id") Long id,
            @Param("userId") Long userId,
            @Param("status") String status,
            @Param("errorMessage") String errorMessage);

    // 删除文档
    @Delete("""
            delete from documents where
            id= #{id} and created_by=#{userId}
            """)
    int deleteByIdAndCreatedBy(
            @Param("id") Long id,
            @Param("userId") Long userId);
}
