package com.knowflow.backend.settings.repository;

import com.knowflow.backend.settings.entity.UserRagSettings;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.Optional;

@Mapper
public interface UserRagSettingsRepository {

    /**
     * 根据用户ID查询用户RAG设置
     *
     * @param userId
     * @return
     */
    @Select("""
            select user_id, top_k, max_context_chunks, temperature, created_at, updated_at
            from user_rag_settings
            where user_id = #{userId}
            """)
    Optional<UserRagSettings> findByUserId(Long userId);


    /**
     * 插入或更新用户RAG设置
     * @param settings
     * @return
     */
    @Insert("""
            insert  into user_rag_settings (
            user_id,top_k,max_context_chunks,temperature
            )
            values (
            #{userId},
            #{topK},
            #{maxContextChunks},
            #{temperature}
            )
            on conflict (user_id)
            do update set
               top_k = excluded.top_k,
               max_context_chunks = excluded.max_context_chunks,
               temperature = excluded.temperature,
               updated_at = now()
            """)
    int upsert(UserRagSettings settings);
}
