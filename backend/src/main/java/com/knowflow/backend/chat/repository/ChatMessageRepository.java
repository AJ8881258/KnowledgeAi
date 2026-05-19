package com.knowflow.backend.chat.repository;

import com.knowflow.backend.chat.entity.ChatMessage;
import org.apache.ibatis.annotations.*;

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
}
