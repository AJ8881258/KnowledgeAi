package com.knowflow.backend.document.repository;

import java.util.List;

import com.knowflow.backend.document.dto.response.SearchResultResponse;
import com.knowflow.backend.document.entity.Document;
import com.knowflow.backend.document.entity.DocumentChunk;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Delete;

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

    /**
     * @param documentId 文档 ID
     * @return 已删除 chunk 数
     * @Desc 阶段 15 重新处理会先删除旧 chunks 再写入新 chunks，确保检索和 Chat 引用不会继续命中旧片段。
     */
    @Delete("""
            DELETE FROM document_chunks
            WHERE document_id = #{documentId}
            """)
    int deleteByDocumentId(Long documentId);

    /**
     * @param documentId 文档 ID
     * @return 拼接后的当前可重建文本；没有 chunk 时返回 null
     * @Desc 当前项目没有保存原始文件二进制或路径，阶段 15 最小可用重处理只能从现有 chunks 重建文本。
     */
    @Select("""
            SELECT string_agg(content, E'\\n\\n' ORDER BY chunk_index)
            FROM document_chunks
            WHERE document_id = #{documentId}
            """)
    String concatenateContentByDocumentId(Long documentId);

    @Select("""
            SELECT COALESCE(SUM(char_count), 0)
            FROM document_chunks
            WHERE document_id = #{documentId}
            """)
    Long sumCharCountByDocumentId(Long documentId);

    @Select("""
            SELECT COALESCE(MIN(char_count), 0)
            FROM document_chunks
            WHERE document_id = #{documentId}
            """)
    Integer minCharCountByDocumentId(Long documentId);

    @Select("""
            SELECT COALESCE(MAX(char_count), 0)
            FROM document_chunks
            WHERE document_id = #{documentId}
            """)
    Integer maxCharCountByDocumentId(Long documentId);

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
            JOIN knowledge_bases kb ON kb.id = d.knowledge_base_id
            LEFT JOIN knowledge_base_members m
              ON m.knowledge_base_id = kb.id
             AND m.user_id = #{userId}
            CROSS JOIN search_query
            WHERE c.knowledge_base_id = #{knowledgeBaseId}
              AND d.knowledge_base_id = #{knowledgeBaseId}
              AND d.status = 'INDEXED'
              AND (kb.created_by = #{userId} OR m.user_id = #{userId})
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
