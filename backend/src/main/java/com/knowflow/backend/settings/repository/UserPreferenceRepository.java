package com.knowflow.backend.settings.repository;

import com.knowflow.backend.settings.entity.UserPreference;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.Optional;

@Mapper
public interface UserPreferenceRepository {

    @Select("""
            select user_id, language, timezone, created_at, updated_at
            from user_preferences
            where user_id = #{userId}
            """)
    Optional<UserPreference> findByUserId(Long userId);

    @Insert("""
            insert into user_preferences (user_id, language, timezone)
            values (#{userId}, #{language}, #{timezone})
            on conflict (user_id)
            do update set
                language = excluded.language,
                timezone = excluded.timezone,
                updated_at = now()
            """)
    int upsert(UserPreference preference);
}
