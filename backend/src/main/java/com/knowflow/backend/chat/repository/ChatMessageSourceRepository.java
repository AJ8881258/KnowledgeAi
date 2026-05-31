package com.knowflow.backend.chat.repository;

import com.knowflow.backend.chat.entity.ChatMessageSource;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ChatMessageSourceRepository {

    /**
     * 插入聊天消息来源
     *
     * @param source 聊天消息来源实体
     *
     */

    @Insert("""
                insert into chat_message_sources (
                message_id, document_id, document_name, chunk_id,
                chunk_index, content, score, hybrid_score, fulltext_score,
                semantic_score, retrieval_mode)
                values (
                #{messageId}, #{documentId}, #{documentName}, #{chunkId},
                #{chunkIndex}, #{content}, #{score}, #{hybridScore}, #{fulltextScore},
                #{semanticScore}, #{retrievalMode}
                )
            """)
    int insert(ChatMessageSource source);


    /**
     * 根据聊天消息ID查询所有聊天消息来源
     *
     * @param messageId 聊天消息ID
     * @return 聊天消息来源列表
     *
     */
    @Select("""
            SELECT id, message_id, document_id, document_name, chunk_id,
            chunk_index, content, score, hybrid_score, fulltext_score,
            semantic_score, retrieval_mode, created_at
             FROM chat_message_sources
             WHERE message_id = #{messageId}
             ORDER BY id ASC
            """)
    List<ChatMessageSource> findAllByMessageId(Long messageId);

}
