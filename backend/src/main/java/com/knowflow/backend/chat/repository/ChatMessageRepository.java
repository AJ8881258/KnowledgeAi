package com.knowflow.backend.chat.repository;

import com.knowflow.backend.chat.entity.ChatMessage;
import org.apache.ibatis.annotations.*;

import java.time.OffsetDateTime;
import java.util.List;

@Mapper
public interface ChatMessageRepository {

    /**
     * 插入聊天消息
     *
     * @param message 聊天消息实体
     *
     */

    @Insert("""
                insert into chat_messages (
                session_id,role,content)
                values (#{sessionId},#{role},#{content})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int insert(ChatMessage message);

    /**
     * @param id 助手消息 ID
     * @param sessionId 当前会话 ID，用于避免跨会话误更新
     * @param content 后端已经保存的完整流式内容
     * @return 更新行数
     * @Desc 阶段 21 流式输出采用边流边保存。每次 delta 到达后更新同一条 ASSISTANT 消息，
     * 刷新页面即可读取已经生成的部分回答。
     */
    @Update("""
            update chat_messages
            set content = #{content}
            where id = #{id}
              and session_id = #{sessionId}
              and role = 'ASSISTANT'
            """)
    int updateAssistantContent(
            @Param("id") Long id,
            @Param("sessionId") Long sessionId,
            @Param("content") String content);

    /**
     * 根据会话ID和用户ID查询聊天消息
     *
     * @param sessionId 会话ID
     * @param userId    用户ID
     * @return 聊天消息列表
     */

    @Select("""
            select m.id, m.session_id, m.role, m.content, m.created_at
            from chat_messages m 
            join chat_sessions s on s.id = m.session_id
            where m.session_id  = #{sessionId} and
            s.user_id = #{userId}
            order by m.created_at asc,m.id asc
            """)
    List<ChatMessage> findAllBySessionIdAndUserId(@Param("sessionId") Long sessionId, @Param("userId") Long userId);


    /**
     * 根据会话ID、用户ID和知识库ID查询最近的聊天消息
     * @param sessionId
     * @param userId
     * @param knowledgeBaseId
     * @param limit
     * @return
     */
    @Select("""
            select id, session_id, role, content, created_at
            from (
                select m.id, m.session_id, m.role, m.content, m.created_at
                from chat_messages m
                join chat_sessions s on s.id = m.session_id
                where m.session_id = #{sessionId}
                  and s.user_id = #{userId}
                  and s.knowledge_base_id = #{knowledgeBaseId}
                order by m.created_at desc, m.id desc
                limit #{limit}
            ) recent_messages
            order by created_at asc, id asc
            """)
    List<ChatMessage> findRecentBySessionIdAndUserIdAndKnowledgeBaseId(
            @Param("sessionId") Long sessionId,
            @Param("userId") Long userId,
            @Param("knowledgeBaseId") Long knowledgeBaseId,
            @Param("limit") Integer limit
    );

    /**
     * @param userId 当前用户ID
     * @param startAt 指定时区当天的开始时间
     * @param endAt 指定时区下一天的开始时间
     * @return 当前用户当天发送的 USER 消息数量
     * @Desc 统计只看当前用户自己的 USER 消息，不统计助手消息，也不统计其他用户会话。
     */
    @Select("""
            select count(*)
            from chat_messages m
            join chat_sessions s on s.id = m.session_id
            where s.user_id = #{userId}
              and m.role = 'USER'
              and m.created_at >= #{startAt}
              and m.created_at < #{endAt}
            """)
    long countUserMessagesCreatedBetween(
            @Param("userId") Long userId,
            @Param("startAt") OffsetDateTime startAt,
            @Param("endAt") OffsetDateTime endAt
    );
}
