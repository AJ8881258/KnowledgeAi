package com.knowflow.backend.user.repository;

import com.knowflow.backend.user.entity.User;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.Optional;

@Mapper
public interface UserRepository {
    @Select("""
                select id, username, password_hash, role, email, phone, avatar_object_key, avatar_preset_id, avatar_updated_at, created_at, updated_at
                from users
                where id = #{id}
            """)
    Optional<User> findById(Long id);

    @Select("""
            select id, username, password_hash, role, email, phone, avatar_object_key, avatar_preset_id, avatar_updated_at, created_at, updated_at
            from users
            where username = #{username}
            """)
    Optional<User> findByUsername(String username);

    @Select("""
            select exists (
                select 1
                from users
                where username = #{username}
            )
            """)
    boolean existsByUsername(String username);

    /**
     * Checks whether another account already uses the requested username. This supports
     * profile editing without forcing the current user to re-register or re-login.
     *
     * @param username normalized target username
     * @param userId current user id, excluded from the uniqueness check
     * @return true when a different user owns the username
     */
    @Select("""
            select exists (
                select 1
                from users
                where lower(username) = lower(#{username})
                  and id <> #{userId}
            )
            """)
    boolean existsByUsernameForOtherUser(@Param("username") String username, @Param("userId") Long userId);

    @Select("""
                select exists (
                    select 1
                    from users
                    where email is not null
                      and lower(email) = lower(#{email})
                      and id <> #{userId}
                )
            """)
    boolean existsByEmailForOtherUser(@Param("email") String email, @Param("userId") Long userId);

    @Insert("""
            insert into users (username, password_hash, role)
            values (#{username}, #{passwordHash}, #{role})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int save(User user);

    @Update("""
            update users
            set password_hash = #{passwordHash},
                updated_at = now()
            where username = #{username}
            """)
    int updatePasswordByUsername(@Param("username") String username, @Param("passwordHash") String passwordHash);

    /**
     * Updates the editable profile fields for the current user. Values are normalized
     * and validated in AuthService; email and phone may be null to intentionally clear them.
     *
     * @param userId current user id
     * @param username normalized username
     * @param email normalized email or null
     * @param phone normalized optional contact phone or null
     * @return updated row count
     */
    @Update("""
                update users
                set username = #{username},
                    email = #{email},
                    phone = #{phone},
                    updated_at = now()
                where id = #{userId}
            """)
    int updateProfileById(
            @Param("userId") Long userId,
            @Param("username") String username,
            @Param("email") String email,
            @Param("phone") String phone
    );

    /**
     * @param userId current user id
     * @param avatarObjectKey OSS object key, never a public URL
     * @return updated row count
     * @Desc Avatar upload stores only object key; signed URLs are generated while reading
     * user profile so the frontend never persists permanent storage addresses.
     */
    @Update("""
                update users
                set avatar_object_key = #{avatarObjectKey},
                    avatar_preset_id = null,
                    avatar_updated_at = now(),
                    updated_at = now()
                where id = #{userId}
            """)
    int updateAvatarObjectKeyById(
            @Param("userId") Long userId,
            @Param("avatarObjectKey") String avatarObjectKey
    );

    /**
     * @param userId current user id
     * @return updated row count
     * @Desc Clearing an avatar removes both uploaded and preset sources; OSS deletion is
     * best-effort and database state remains the source of truth.
     */
    @Update("""
                update users
                set avatar_object_key = null,
                    avatar_preset_id = null,
                    avatar_updated_at = now(),
                    updated_at = now()
                where id = #{userId}
            """)
    int clearAvatarObjectKeyById(Long userId);

    /**
     * @param userId current user id
     * @param avatarPresetId server allow-listed preset id
     * @return updated row count
     * @Desc Preset selection clears uploaded object key so UserResponse exposes exactly one
     * avatar source: PRESET, UPLOAD, or NONE.
     */
    @Update("""
                update users
                set avatar_object_key = null,
                    avatar_preset_id = #{avatarPresetId},
                    avatar_updated_at = now(),
                    updated_at = now()
                where id = #{userId}
            """)
    int updateAvatarPresetById(
            @Param("userId") Long userId,
            @Param("avatarPresetId") String avatarPresetId
    );

    @Delete("""
                delete from chat_sessions where user_id = #{userId}
            """)
    int deleteChatSessionsByUserId(Long userId);

    @Delete("""
            delete from documents
            where created_by = #{userId}
            """)
    int deleteDocumentsByCreatedBy(Long userId);

    @Delete("""
                delete from knowledge_bases where created_by = #{userId}
            """)
    int deleteKnowledgeBasesByCreatedBy(Long userId);

    @Delete("""
                delete from users where id = #{userId}
            """)
    int deleteById(Long userId);
}
