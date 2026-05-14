package com.knowflow.backend.document;

import java.util.List;

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
}