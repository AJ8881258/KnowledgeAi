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
                source_bytes,
                source_text,
                source_text_updated_at,
                created_by
            )
            values (
                #{knowledgeBaseId},
                #{originalFilename},
                #{contentType},
                #{sizeBytes},
                #{status},
                #{errorMessage},
                #{sourceBytes},
                #{sourceText},
                #{sourceTextUpdatedAt},
                #{createdBy}
            )
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int insert(Document document);

    @Select("""
            select id, knowledge_base_id, original_filename, content_type, size_bytes,
                   status, error_message, embedding_status, embedding_error_message, embedding_updated_at,
                   summary, summary_updated_at,
                   source_bytes is not null as source_bytes_stored,
                   source_text is not null and source_text <> '' as source_text_stored,
                   source_text_updated_at,
                   created_by, created_at, updated_at
            from documents
            where knowledge_base_id = #{knowledgeBaseId}
            order by id desc
            """)
    List<Document> findAllByKnowledgeBaseId(Long knowledgeBaseId);

    @Select("""
            select id, knowledge_base_id, original_filename, content_type, size_bytes,
                   status, error_message, embedding_status, embedding_error_message, embedding_updated_at,
                   summary, summary_updated_at,
                   source_bytes is not null as source_bytes_stored,
                   source_text is not null and source_text <> '' as source_text_stored,
                   source_text_updated_at,
                   created_by, created_at, updated_at
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
                   status, error_message, embedding_status, embedding_error_message, embedding_updated_at,
                   summary, summary_updated_at,
                   source_bytes is not null as source_bytes_stored,
                   source_text is not null and source_text <> '' as source_text_stored,
                   source_text_updated_at,
                   created_by, created_at, updated_at
            from documents
            where id = #{id}
              and created_by = #{userId}
            """)
    Optional<Document> findByIdAndCreatedBy(@Param("id") Long id, @Param("userId") Long userId);

    @Select("""
            select d.id, d.knowledge_base_id, d.original_filename, d.content_type, d.size_bytes,
                   d.status, d.error_message, d.embedding_status, d.embedding_error_message, d.embedding_updated_at,
                   d.summary, d.summary_updated_at,
                   d.source_bytes is not null as source_bytes_stored,
                   d.source_text is not null and d.source_text <> '' as source_text_stored,
                   d.source_text_updated_at,
                   d.created_by, d.created_at, d.updated_at
            from documents d
            join knowledge_bases kb on kb.id = d.knowledge_base_id
            left join knowledge_base_members m
              on m.knowledge_base_id = kb.id
             and m.user_id = #{userId}
            where d.id = #{id}
              and (kb.created_by = #{userId} or m.user_id = #{userId})
            """)
    Optional<Document> findAccessibleById(@Param("id") Long id, @Param("userId") Long userId);

    @Select("""
            select d.id, d.knowledge_base_id, d.original_filename, d.content_type, d.size_bytes,
                   d.status, d.error_message, d.embedding_status, d.embedding_error_message, d.embedding_updated_at,
                   d.summary, d.summary_updated_at,
                   d.source_bytes,
                   d.source_bytes is not null as source_bytes_stored,
                   d.source_text,
                   d.source_text is not null and d.source_text <> '' as source_text_stored,
                   d.source_text_updated_at,
                   d.created_by, d.created_at, d.updated_at
            from documents d
            join knowledge_bases kb on kb.id = d.knowledge_base_id
            left join knowledge_base_members m
              on m.knowledge_base_id = kb.id
             and m.user_id = #{userId}
            where d.id = #{id}
              and (kb.created_by = #{userId} or m.user_id = #{userId})
            """)
    Optional<Document> findAccessibleSourceById(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * @param knowledgeBaseId knowledge base requested for a batch semantic rebuild
     * @return indexed documents that already have chunks and can be re-embedded without reparsing source
     * @Desc Stage 19 batch rebuild intentionally skips failed/unindexed documents because semantic
     * rebuild is not a text reprocess operation. It only refreshes embeddings for existing chunks.
     */
    @Select("""
            select d.id, d.knowledge_base_id, d.original_filename, d.content_type, d.size_bytes,
                   d.status, d.error_message, d.embedding_status, d.embedding_error_message, d.embedding_updated_at,
                   d.summary, d.summary_updated_at,
                   d.source_bytes is not null as source_bytes_stored,
                   d.source_text is not null and d.source_text <> '' as source_text_stored,
                   d.source_text_updated_at,
                   d.created_by, d.created_at, d.updated_at
            from documents d
            where d.knowledge_base_id = #{knowledgeBaseId}
              and d.status = 'INDEXED'
              and exists (
                  select 1
                  from document_chunks c
                  where c.document_id = d.id
              )
            order by d.id
            """)
    List<Document> findSemanticRebuildCandidatesByKnowledgeBaseId(Long knowledgeBaseId);

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

    /**
     * @param id 文档 ID
     * @param status 新处理状态
     * @param errorMessage 脱敏后的失败原因；成功时传 null 清除旧错误
     * @return 更新行数
     * @Desc 阶段 15 重处理允许 OWNER/EDITOR 操作别人上传到同一知识库的文档，
     * 因此状态更新不能再限定 created_by，只在调用前通过知识库角色校验权限。
     */
    @Update("""
            update documents
            set status = #{status},
                error_message = #{errorMessage},
                updated_at = now()
            where id = #{id}
            """)
    int updateStatusById(
            @Param("id") Long id,
            @Param("status") String status,
            @Param("errorMessage") String errorMessage);

    /**
     * @param id document ID
     * @param embeddingStatus semantic indexing state: PROCESSING, INDEXED, SKIPPED, or FAILED
     * @param embeddingErrorMessage sanitized failure reason; null for successful or skipped indexing
     * @return updated row count
     * @Desc Stage 18 keeps document text indexing separate from embedding indexing.
     * A document can remain searchable by full-text while this field reports semantic indexing failure.
     */
    @Update("""
            update documents
            set embedding_status = #{embeddingStatus},
                embedding_error_message = #{embeddingErrorMessage},
                embedding_updated_at = now(),
                updated_at = now()
            where id = #{id}
            """)
    int updateEmbeddingStatusById(
            @Param("id") Long id,
            @Param("embeddingStatus") String embeddingStatus,
            @Param("embeddingErrorMessage") String embeddingErrorMessage);

    /**
     * Stores the normalized text produced by a successful extraction.
     *
     * @param id document ID
     * @param sourceText normalized extracted text; not returned by public APIs
     * @return updated row count
     */
    @Update("""
            update documents
            set source_text = #{sourceText},
                source_text_updated_at = now(),
                updated_at = now()
            where id = #{id}
            """)
    int updateSourceTextById(@Param("id") Long id, @Param("sourceText") String sourceText);

    /**
     * @param id 文档 ID
     * @param summary 生成后的摘要正文
     * @return 更新行数
     * @Desc 摘要只落在文档记录上，用于详情展示；不会写入 document_chunks 或 chat_message_sources。
     */
    @Update("""
            update documents
            set summary = #{summary},
                summary_updated_at = now(),
                updated_at = now()
            where id = #{id}
            """)
    int updateSummaryById(@Param("id") Long id, @Param("summary") String summary);

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
