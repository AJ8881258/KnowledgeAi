package com.knowflow.backend.settings.repository;

import com.knowflow.backend.settings.entity.UserModelSettings;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.Optional;

@Mapper
public interface UserModelSettingsRepository {

    /**
     * 根据用户ID查询用户模型设置
     * @param userId
     * @return
     */
    @Select("""
            select user_id, base_url, encrypted_api_key, model, timeout_seconds, created_at, updated_at
            from user_model_settings
            where user_id = #{userId}
            """)
    Optional<UserModelSettings> findByUserId(Long userId);

    /**
     * 插入或更新用户模型设置
     * @param settings
     * @return
     */
    @Insert("""
            insert into user_model_settings (
                user_id, base_url, encrypted_api_key, model, timeout_seconds
            )
            values (
                #{userId}, #{baseUrl}, #{encryptedApiKey}, #{model}, #{timeoutSeconds}
            )
            on conflict (user_id)
            do update set
                base_url = excluded.base_url,
                encrypted_api_key = excluded.encrypted_api_key,
                model = excluded.model,
                timeout_seconds = excluded.timeout_seconds,
                updated_at = now()
            """)
    int upsert(UserModelSettings settings);
}
