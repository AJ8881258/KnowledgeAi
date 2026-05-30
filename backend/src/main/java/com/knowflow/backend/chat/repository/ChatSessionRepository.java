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
                                      user_id,
                                      unread,
                                      status)
            values (#{title},#{knowledgeBaseId},#{userId},false,'IDLE')
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
                select id,title,knowledge_base_id,user_id,pinned,unread,status,last_error_message,active_generation_id,created_at,updated_at
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
                select id,title,knowledge_base_id,user_id,pinned,unread,status,last_error_message,active_generation_id,created_at,updated_at
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
                update chat_sessions
                set title = coalesce(#{title},title),
                    pinned = coalesce(#{pinned},pinned),
                    unread = coalesce(#{unread},unread),
                    updated_at = now()
                where id = #{id} and user_id = #{userId}
            """)
    int updateByIdAndUserId(
            @Param("id") Long id,
            @Param("userId") Long userId,
            @Param("title") String title,
            @Param("pinned") Boolean pinned,
            @Param("unread") Boolean unread
    );

    /**
     * @param id               会话ID
     * @param userId           当前用户ID
     * @param status           生成状态：IDLE、GENERATING、FAILED
     * @param lastErrorMessage 最近一次失败的脱敏错误
     * @param unread           是否更新未读标记，传 null 表示保持原值
     * @return 更新行数
     * @Desc 后台生成任务用它落库状态，前端轮询会话列表时能看到生成进度。
     */
    @Update("""
                update chat_sessions
                set status = #{status},
                    last_error_message = #{lastErrorMessage},
                    unread = coalesce(#{unread}, unread),
                    updated_at = now()
                where id = #{id} and user_id = #{userId}
            """)
    int updateStatus(
            @Param("id") Long id,
            @Param("userId") Long userId,
            @Param("status") String status,
            @Param("lastErrorMessage") String lastErrorMessage,
            @Param("unread") Boolean unread
    );

    /**
     * @param id                 会话 ID
     * @param userId             当前用户 ID
     * @param activeGenerationId 本次后台生成 ID，用于和异步任务回写时做一致性校验
     * @return 更新行数
     * @Desc 发送消息时把会话置为 GENERATING，并记录唯一生成 ID；后续 cancel 会清空该 ID，防止旧任务继续落库。
     */
    @Update("""
                update chat_sessions
                set status = 'GENERATING',
                    last_error_message = null,
                    active_generation_id = #{activeGenerationId},
                    unread = false,
                    updated_at = now()
                where id = #{id} and user_id = #{userId}
            """)
    int beginGeneration(
            @Param("id") Long id,
            @Param("userId") Long userId,
            @Param("activeGenerationId") String activeGenerationId
    );

    /**
     * @param id     会话 ID
     * @param userId 当前用户 ID
     * @return 更新行数
     * @Desc 用户点击“打断”时结束当前生成状态；只清空 activeGenerationId，不删除已保存的用户消息。
     */
    @Update("""
                update chat_sessions
                set status = 'IDLE',
                    last_error_message = null,
                    active_generation_id = null,
                    updated_at = now()
                where id = #{id} and user_id = #{userId} and status = 'GENERATING'
            """)
    int cancelGeneration(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * @param id                 会话 ID
     * @param userId             当前用户 ID
     * @param activeGenerationId 异步任务启动时拿到的生成 ID
     * @return true 表示该任务仍是当前会话最新生成，允许写入助手消息和 sources
     * @Desc 防止“打断”后的旧模型响应覆盖会话状态或追加过期回答。
     */
    @Select("""
                select count(1) > 0
                from chat_sessions
                where id = #{id}
                  and user_id = #{userId}
                  and status = 'GENERATING'
                  and active_generation_id = #{activeGenerationId}
            """)
    boolean isActiveGeneration(
            @Param("id") Long id,
            @Param("userId") Long userId,
            @Param("activeGenerationId") String activeGenerationId
    );

    /**
     * @param id                 会话 ID
     * @param userId             当前用户 ID
     * @param activeGenerationId 异步任务启动时拿到的生成 ID
     * @param status             最终状态：IDLE 或 FAILED
     * @param lastErrorMessage   失败时的脱敏错误；成功时传 null
     * @param unread             是否标记未读
     * @return 更新行数；0 表示任务已被打断或被新的生成替换
     * @Desc 只有生成 ID 仍匹配时才允许结束生成，避免取消后的旧任务回写状态。
     */
    @Update("""
                update chat_sessions
                set status = #{status},
                    last_error_message = #{lastErrorMessage},
                    unread = coalesce(#{unread}, unread),
                    active_generation_id = null,
                    updated_at = now()
                where id = #{id}
                  and user_id = #{userId}
                  and active_generation_id = #{activeGenerationId}
            """)
    int finishGeneration(
            @Param("id") Long id,
            @Param("userId") Long userId,
            @Param("activeGenerationId") String activeGenerationId,
            @Param("status") String status,
            @Param("lastErrorMessage") String lastErrorMessage,
            @Param("unread") Boolean unread
    );

    /**
     * @param id     会话ID
     * @param userId 当前用户ID
     * @return 更新行数
     * @Desc 用户打开消息列表后，将该会话标记为已读。
     */
    @Update("""
                update chat_sessions
                set unread = false,
                    updated_at = now()
                where id = #{id} and user_id = #{userId}
            """)
    int markRead(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * @param id
     * @param userId
     * @return
     * @des 删除会话
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
