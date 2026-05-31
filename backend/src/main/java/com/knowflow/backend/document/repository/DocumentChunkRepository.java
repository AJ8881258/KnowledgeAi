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
import org.apache.ibatis.annotations.Update;

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
            SELECT id, document_id, knowledge_base_id, chunk_index, content, char_count, embedding_status, created_at
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
                ) AS score,
                CAST(
                    CASE
                        WHEN to_tsvector('simple', c.content) @@ search_query.ts_query
                            THEN ts_rank_cd(to_tsvector('simple', c.content), search_query.ts_query)
                        ELSE 0.0
                    END AS double precision
                ) AS hybrid_score,
                CAST(
                    CASE
                        WHEN to_tsvector('simple', c.content) @@ search_query.ts_query
                            THEN ts_rank_cd(to_tsvector('simple', c.content), search_query.ts_query)
                        ELSE 0.0
                    END AS double precision
                ) AS fulltext_score,
                CAST(0.0 AS double precision) AS semantic_score,
                'FULLTEXT' AS retrieval_mode
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

    /**
     * @param knowledgeBaseId 当前 Chat 会话绑定的知识库 ID
     * @param userId 当前 JWT 用户 ID，用于复用知识库成员权限隔离
     * @param documentIds @ mention 或标题感知命中的文档 ID 列表
     * @param limit 最多返回多少个 chunk
     * @return 指定文档的前若干 chunk，按文档和 chunk 顺序排列
     * @Desc 阶段 21 修复“按文件标题指定文档但问题本身缺少正文关键词”的场景。
     * 与全文检索不同，这里不再要求 query 命中 chunk 内容，而是把用户明确指定的文档片段直接作为 RAG 上下文。
     */
    @Select("""
            <script>
            SELECT
                c.id AS chunk_id,
                c.document_id,
                d.original_filename AS document_name,
                c.chunk_index,
                c.content,
                CAST(1.0 AS double precision) AS score,
                CAST(1.0 AS double precision) AS hybrid_score,
                CAST(1.0 AS double precision) AS fulltext_score,
                CAST(0.0 AS double precision) AS semantic_score,
                'MENTION' AS retrieval_mode
            FROM document_chunks c
            JOIN documents d ON d.id = c.document_id
            JOIN knowledge_bases kb ON kb.id = d.knowledge_base_id
            LEFT JOIN knowledge_base_members m
              ON m.knowledge_base_id = kb.id
             AND m.user_id = #{userId}
            WHERE c.knowledge_base_id = #{knowledgeBaseId}
              AND d.knowledge_base_id = #{knowledgeBaseId}
              AND d.status = 'INDEXED'
              AND (kb.created_by = #{userId} OR m.user_id = #{userId})
              AND c.document_id IN
              <foreach collection="documentIds" item="documentId" open="(" separator="," close=")">
                #{documentId}
              </foreach>
            ORDER BY d.updated_at DESC, d.id DESC, c.chunk_index ASC, c.id ASC
            LIMIT #{limit}
            </script>
            """)
    List<SearchResultResponse> findIndexedChunksByDocumentIds(
            @Param("knowledgeBaseId") Long knowledgeBaseId,
            @Param("userId") Long userId,
            @Param("documentIds") List<Long> documentIds,
            @Param("limit") Integer limit);

    /**
     * @param knowledgeBaseId knowledge base search scope
     * @param userId current JWT user; used in the membership join to prevent cross-user leakage
     * @param query original text query for PostgreSQL full-text scoring
     * @param queryEmbedding pgvector literal generated from the same query, for example [0.1,0.2]
     * @param limit maximum number of chunks to return
     * @param semanticWeight weight applied to vector similarity
     * @param fulltextWeight weight applied to PostgreSQL full-text score
     * @return chunks ranked by a weighted semantic/full-text score with per-score breakdown fields
     * @Desc Stage 19 keeps the Stage 18 hybrid shape but makes the weights user-controlled.
     * The response still fills the old score field so older frontend code remains compatible.
     */
    @Select("""
            WITH search_query AS (
                SELECT websearch_to_tsquery('simple', #{query}) AS ts_query
            ),
            query_embedding AS (
                SELECT #{queryEmbedding}::vector AS embedding
            ),
            accessible_chunks AS (
                SELECT c.id,
                       c.document_id,
                       d.original_filename AS document_name,
                       c.chunk_index,
                       c.content,
                       d.updated_at,
                       c.embedding,
                       c.embedding_status
                FROM document_chunks c
                JOIN documents d ON d.id = c.document_id
                JOIN knowledge_bases kb ON kb.id = d.knowledge_base_id
                LEFT JOIN knowledge_base_members m
                  ON m.knowledge_base_id = kb.id
                 AND m.user_id = #{userId}
                WHERE c.knowledge_base_id = #{knowledgeBaseId}
                  AND d.knowledge_base_id = #{knowledgeBaseId}
                  AND d.status = 'INDEXED'
                  AND (kb.created_by = #{userId} OR m.user_id = #{userId})
            ),
            fulltext AS (
                SELECT c.id AS chunk_id,
                       CAST(
                           CASE
                               WHEN to_tsvector('simple', c.content) @@ search_query.ts_query
                                   THEN ts_rank_cd(to_tsvector('simple', c.content), search_query.ts_query)
                               ELSE 0.0
                           END AS double precision
                       ) AS fulltext_score
                FROM accessible_chunks c
                CROSS JOIN search_query
                WHERE to_tsvector('simple', c.content) @@ search_query.ts_query
                   OR position(lower(#{query}) in lower(c.content)) > 0
            ),
            semantic AS (
                SELECT c.id AS chunk_id,
                       CAST(GREATEST(0.0, 1.0 - (c.embedding <=> query_embedding.embedding)) AS double precision) AS semantic_score
                FROM accessible_chunks c
                CROSS JOIN query_embedding
                WHERE c.embedding IS NOT NULL
                  AND c.embedding_status = 'INDEXED'
            ),
            combined AS (
                SELECT c.id AS chunk_id,
                       c.document_id,
                       c.document_name,
                       c.chunk_index,
                       c.content,
                       c.updated_at,
                       COALESCE(f.fulltext_score, 0.0) AS fulltext_score,
                       COALESCE(s.semantic_score, 0.0) AS semantic_score
                FROM accessible_chunks c
                LEFT JOIN fulltext f ON f.chunk_id = c.id
                LEFT JOIN semantic s ON s.chunk_id = c.id
                WHERE f.chunk_id IS NOT NULL OR s.chunk_id IS NOT NULL
            )
            SELECT chunk_id,
                   document_id,
                   document_name,
                   chunk_index,
                   content,
                   CAST((
                       semantic_score * #{semanticWeight}
                       + CASE WHEN fulltext_score > 0.0 THEN 1.0 ELSE 0.0 END * #{fulltextWeight}
                   ) AS double precision) AS score,
                   CAST((
                       semantic_score * #{semanticWeight}
                       + CASE WHEN fulltext_score > 0.0 THEN 1.0 ELSE 0.0 END * #{fulltextWeight}
                   ) AS double precision) AS hybrid_score,
                   fulltext_score,
                   semantic_score,
                   'HYBRID' AS retrieval_mode
            FROM combined
            ORDER BY hybrid_score DESC, fulltext_score DESC, updated_at DESC, chunk_id ASC
            LIMIT #{limit}
            """)
    List<SearchResultResponse> searchHybridIndexedChunks(
            @Param("knowledgeBaseId") Long knowledgeBaseId,
            @Param("userId") Long userId,
            @Param("query") String query,
            @Param("queryEmbedding") String queryEmbedding,
            @Param("limit") Integer limit,
            @Param("semanticWeight") Double semanticWeight,
            @Param("fulltextWeight") Double fulltextWeight);

    /**
     * @param documentId document whose existing chunks are being semantically re-indexed
     * @param embeddingStatus PROCESSING, INDEXED, FAILED, or SKIPPED
     * @return updated row count
     * @Desc Stage 19 semantic rebuild keeps chunk text and IDs stable. This helper only changes
     * embedding state, so full-text search and existing citations remain usable during rebuild.
     */
    @Update("""
            UPDATE document_chunks
            SET embedding = NULL,
                embedding_status = #{embeddingStatus},
                embedding_updated_at = now()
            WHERE document_id = #{documentId}
            """)
    int updateEmbeddingStatusByDocumentId(
            @Param("documentId") Long documentId,
            @Param("embeddingStatus") String embeddingStatus);

    /**
     * @param documentId document that owns the chunk
     * @param chunkIndex stable chunk index inside the document
     * @param embeddingStatus INDEXED when vector exists, FAILED/SKIPPED otherwise
     * @param embeddingLiteral pgvector literal, or null when no vector is available
     * @return updated row count
     * @Desc Embeddings are updated after text chunks are inserted so text indexing can still
     * succeed even if the semantic model fails.
     */
    @Update("""
            UPDATE document_chunks
            SET embedding = CASE WHEN #{embeddingLiteral} IS NULL THEN NULL ELSE #{embeddingLiteral}::vector END,
                embedding_status = #{embeddingStatus},
                embedding_updated_at = now()
            WHERE document_id = #{documentId}
              AND chunk_index = #{chunkIndex}
            """)
    int updateEmbeddingByDocumentIdAndChunkIndex(
            @Param("documentId") Long documentId,
            @Param("chunkIndex") Integer chunkIndex,
            @Param("embeddingStatus") String embeddingStatus,
            @Param("embeddingLiteral") String embeddingLiteral);

    /**
     * @param documentId document that owns the chunk
     * @param chunkIndex stable chunk index inside the document
     * @param embeddingStatus FAILED or SKIPPED when no vector should be stored
     * @return updated row count
     * @Desc This method intentionally avoids `::vector` parameters. When embedding is skipped
     * or the provider fails, PostgreSQL does not need to infer a vector type from null.
     */
    @Update("""
            UPDATE document_chunks
            SET embedding = NULL,
                embedding_status = #{embeddingStatus},
                embedding_updated_at = now()
            WHERE document_id = #{documentId}
              AND chunk_index = #{chunkIndex}
            """)
    int updateEmbeddingStatusByDocumentIdAndChunkIndex(
            @Param("documentId") Long documentId,
            @Param("chunkIndex") Integer chunkIndex,
            @Param("embeddingStatus") String embeddingStatus);
}
