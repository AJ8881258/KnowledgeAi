package com.knowflow.backend.user.repository;

import java.util.Optional;

import com.knowflow.backend.user.entity.User;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserRepository {

    /**
     * 根据ID查询用户
     *
     * @param id
     * @return
     */
    @Select("""
                select id,username,password_hash,role,email,created_at,updated_at
                from users
                where id = #{id}
            """)
    Optional<User> findById(Long id);

    /**
     * 根据用户名查询用户
     *
     * @param username
     * @return
     */
    @Select("""
            SELECT id, username, password_hash, role,email, created_at, updated_at
            FROM users
            WHERE username = #{username}
            """)
    Optional<User> findByUsername(String username);


    /**
     * 根据用户名查询用户是否存在
     *
     * @param username
     * @return
     */
    // if Exist
    @Select("""
            SELECT EXISTS (
                SELECT 1
                FROM users
                WHERE username = #{username}
            )
            """)
    boolean existsByUsername(String username);


    /**
     * 检查邮箱是否被其他用户占用。
     *
     * @param email
     * @param userId
     * @return
     */
    @Select("""
                select  exists (select  1 from users where
                email is not null and
                lower(email) = lower(#{email}) and
                id <> #{userId})

            """)
    boolean existsByEmailForOtherUser(@Param("email") String email, @Param("userId") Long userId);


    /**
     * 保存用户
     *
     * @param user
     * @return
     */
    @Insert("""
            INSERT INTO users (username, password_hash, role)
            VALUES (#{username}, #{passwordHash}, #{role})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int save(User user);


    /**
     * 根据用户名更新用户密码
     *
     * @param username
     * @param passwordHash
     * @return
     */
    @Update("""
            update users set password_hash = #{passwordHash},
            updated_at =now()
            where username = #{username}
            """)
    int updatePasswordByUsername(@Param("username") String username, @Param("passwordHash") String passwordHash);


    /**
     * \
     * 只按当前用户 id 更新 email。
     *
     * @param userId
     * @param email
     * @return
     */
    @Update("""
                update users
                set email = #{email},
                updated_at = now()
                where id = #{userId}
            """)
    int updateEmailById(
            @Param("userId") Long userId,
            @Param("email") String email
    );

    /**
     * 删除用户的所有聊天会话。
     *
     * @param userId
     * @return
     */

    @Delete("""
                delete from chat_sessions where user_id = #{userId}
            """)
    int deleteChatSessionsByUserId(Long userId);

    /**
     * @param userId
     * @return
     * @Desc 删除当前用户的所有文档
     */
    @Delete("""
            delete from documents
            where created_by = #{userId}
            """)
    int deleteDocumentsByCreatedBy(Long userId);

    /**
     * 删除用户创建的所有知识库。
     *
     * @param userId
     * @return
     */
    @Delete("""
                delete from knowledge_bases where created_by = #{userId}
            """)
    int deleteKnowledgeBasesByCreatedBy(Long userId);

    /**
     * 删除用户。
     *
     * @param userId
     * @return
     */
    @Delete("""
                delete from users where id = #{userId}
            """)
    int deleteById(Long userId);
}
