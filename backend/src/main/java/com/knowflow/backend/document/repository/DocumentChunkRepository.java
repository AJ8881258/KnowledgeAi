package com.knowflow.backend.document.repository;

import java.util.List;

import com.knowflow.backend.document.dto.response.SearchResultResponse;
import com.knowflow.backend.document.entity.Document;
import com.knowflow.backend.document.entity.DocumentChunk;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface DocumentChunkRepository {

    // 插入文档片段
    @Insert("""
            INSERT INTO document_chunks (
                document_id,
                knowledge_base_id,
                chunk_index,
                content,
                char_count
            )
            VALUES (
                #{documentId},
                #{knowledgeBaseId},
                #{chunkIndex},
                #{content},
                #{charCount}
            )
            """)
    int insert(DocumentChunk chunk);

    // 查询文档片段
    @Select("""
            SELECT id, document_id, knowledge_base_id, chunk_index, content, char_count, created_at
            FROM document_chunks
            WHERE document_id = #{documentId}
            ORDER BY chunk_index
            """)
    List<DocumentChunk> findAllByDocumentId(Long documentId);

    // 统计文档片段数量
    @Select("""
            SELECT COUNT(*)
            FROM document_chunks
            WHERE document_id = #{documentId}
            """)
    Long countByDocumentId(Long documentId);

    // 根据文档 ID 查询文档片段
    @Select("""
            SELECT d.id, d.knowledge_base_id, d.original_filename, d.content_type, d.size_bytes,
                   d.status, d.error_message, d.created_by, d.created_at, d.updated_at
            FROM documents d
            WHERE d.id = #{documentId}
              AND d.created_by = #{userId}
            """)
    Document findDocumentForCurrentUser(
            @Param("documentId") Long documentId,
            @Param("userId") Long userId);


    /**
     * 搜索文档片段
     *
     * @param knowledgeBaseId
     * @param userId
     * @param query
     * @param limit
     * @return
     */
    @Select("""
            WITH search_query AS (
                SELECT websearch_to_tsquery('simple', #{query}) AS ts_query
            )
            SELECT
                c.id AS chunk_id,
                c.document_id,
                d.original_filename AS document_name,
                c.chunk_index,
                c.content,
                CAST(
                    CASE
                        WHEN to_tsvector('simple', c.content) @@ search_query.ts_query
                            THEN ts_rank_cd(to_tsvector('simple', c.content), search_query.ts_query)
                        ELSE 0.0
                    END AS double precision
                ) AS score
            FROM document_chunks c
            JOIN documents d ON d.id = c.document_id
            CROSS JOIN search_query
            WHERE c.knowledge_base_id = #{knowledgeBaseId}
              AND d.knowledge_base_id = #{knowledgeBaseId}
              AND d.created_by = #{userId}
              AND d.status = 'INDEXED'
              AND (
                    to_tsvector('simple', c.content) @@ search_query.ts_query
                    OR position(lower(#{query}) in lower(c.content)) > 0
              )
            ORDER BY score DESC, d.updated_at DESC, c.id ASC
            LIMIT #{limit}
            """)
    List<SearchResultResponse> searchIndexedChunks(
            @Param("knowledgeBaseId") Long knowledgeBaseId,
            @Param("userId") Long userId,
            @Param("query") String query,
            @Param("limit") Integer limit);
}
