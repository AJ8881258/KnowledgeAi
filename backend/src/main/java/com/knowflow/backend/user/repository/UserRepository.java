package com.knowflow.backend.user.repository;

import java.util.Optional;

import com.knowflow.backend.user.entity.User;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserRepository {

    /**
     * 根据ID查询用户
     *
     * @param id
     * @return
     */
    @Select("""
                select id,username,password_hash,role,created_at,updated_at
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
    // Find by username
    @Select("""
            SELECT id, username, password_hash, role, created_at, updated_at
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
    int updatePasswordByUsername(String username, String passwordHash);

}
