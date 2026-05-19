package com.knowflow.backend.chat.repository;

import com.knowflow.backend.chat.entity.ChatSession;
import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Optional;

@Mapper
public interface ChatSessionRepository {
    /**
     * 插入聊天会话
     *
     * @param session 聊天会话实例
     */
    @Insert("""
            insert into chat_sessions (title,
                                      knowledge_base_id,
                                      user_id)
            values (#{title},#{knowledgeBaseId},#{userId})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int insert(ChatSession session);


    /**
     * 根据知识库ID和用户ID查询所有会话
     *
     * @param knowledgeBaseId 知识库ID
     * @param userId          用户ID
     * @return 所有会话列表
     */

    @Select("""
                select id,title,knowledge_base_id,user_id,pinned,created_at,updated_at
                from chat_sessions
                where knowledge_base_id = #{knowledgeBaseId} and
                user_id = #{userId}
                order by pinned desc, updated_at desc, id desc
            """)
    List<ChatSession> findAllByKnowledgeBaseIdAndUserId(@Param("knowledgeBaseId") Long knowledgeBaseId, @Param("userId") Long userId);

    /**
     * 根据ID和用户ID查询会话
     *
     * @param id     会话ID
     * @param userId 用户ID
     * @return 会话实例
     */

    @Select("""
                select id,title,knowledge_base_id,user_id,pinned,created_at,updated_at
                from chat_sessions
                where id = #{id} and user_id = #{userId}
            """)
    Optional<ChatSession> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 根据ID和用户ID更新会话的更新时间
     *
     * @param id     id
     * @param userId 用户ID
     * @return 更新的行数
     */

    @Update("""
                update chat_sessions set updated_at = now() 
                where id = #{id} and user_id = #{userId}
            """)
    int touch(@Param("id") Long id, @Param("userId") Long userId);


    /**
     * @param id
     * @param userId
     * @param title
     * @param pinned
     * @return
     * @Des 根据Id和用户Id进行更新
     */

    @Update("""
                update chat_sessions set title = coalesce(#{title},title),pinned = coalesce(#{pinned},pinned),updated_at = now()
                where id = #{id} and user_id = #{userId}
            """)
    int updateByIdAndUserId(
            @Param("id") Long id,
            @Param("userId") Long userId,
            @Param("title") String title,
            @Param("pinned") Boolean pinned
    );

    /**
     * @des 删除会话
     * @param id
     * @param userId
     * @return
     */

    @Delete("""
                delete from chat_sessions where
                       id = #{id} and
                       user_id = #{userId}
            """)
    int deleteByIdAndUserId(
            @Param("id") Long id,
            @Param("userId") Long userId
    );

}
