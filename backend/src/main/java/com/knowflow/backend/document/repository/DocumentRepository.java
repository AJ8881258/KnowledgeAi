package com.knowflow.backend.document.repository;

import com.knowflow.backend.document.entity.Document;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;
import java.util.Optional;

@Mapper
public interface DocumentRepository {

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
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int insert(Document document);

    @Select("""
            select id, knowledge_base_id, original_filename, content_type, size_bytes,
                   status, error_message, created_by, created_at, updated_at
            from documents
            where knowledge_base_id = #{knowledgeBaseId}
            order by id desc
            """)
    List<Document> findAllByKnowledgeBaseId(Long knowledgeBaseId);

    @Select("""
            select id, knowledge_base_id, original_filename, content_type, size_bytes,
                   status, error_message, created_by, created_at, updated_at
            from documents
            where knowledge_base_id = #{knowledgeBaseId}
              and created_by = #{userId}
            order by id desc
            """)
    List<Document> findAllByKnowledgeBaseIdAndCreatedBy(
            @Param("knowledgeBaseId") Long knowledgeBaseId,
            @Param("userId") Long userId);

    @Select("""
            select id, knowledge_base_id, original_filename, content_type, size_bytes,
                   status, error_message, created_by, created_at, updated_at
            from documents
            where id = #{id}
              and created_by = #{userId}
            """)
    Optional<Document> findByIdAndCreatedBy(@Param("id") Long id, @Param("userId") Long userId);

    @Select("""
            select d.id, d.knowledge_base_id, d.original_filename, d.content_type, d.size_bytes,
                   d.status, d.error_message, d.created_by, d.created_at, d.updated_at
            from documents d
            join knowledge_bases kb on kb.id = d.knowledge_base_id
            left join knowledge_base_members m
              on m.knowledge_base_id = kb.id
             and m.user_id = #{userId}
            where d.id = #{id}
              and (kb.created_by = #{userId} or m.user_id = #{userId})
            """)
    Optional<Document> findAccessibleById(@Param("id") Long id, @Param("userId") Long userId);

    @Update("""
            update documents
            set status = #{status},
                error_message = #{errorMessage},
                updated_at = now()
            where id = #{id}
              and created_by = #{userId}
            """)
    int updateStatusByIdAndCreatedBy(
            @Param("id") Long id,
            @Param("userId") Long userId,
            @Param("status") String status,
            @Param("errorMessage") String errorMessage);

    @Delete("""
            delete from documents
            where id = #{id}
              and created_by = #{userId}
            """)
    int deleteByIdAndCreatedBy(
            @Param("id") Long id,
            @Param("userId") Long userId);

    @Delete("""
            delete from documents
            where id = #{id}
            """)
    int deleteById(Long id);
}
