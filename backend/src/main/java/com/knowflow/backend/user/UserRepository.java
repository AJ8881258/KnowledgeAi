package com.knowflow.backend.user;

import java.util.Optional;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserRepository {
    // Find by username

    @Select("""
            SELECT id, username, password_hash, role, created_at, updated_at
            FROM users
            WHERE username = #{username}
            """)
    Optional<User> findByUsername(String username);

    // if Exist
    @Select("""
            SELECT EXISTS (
                SELECT 1
                FROM users
                WHERE username = #{username}
            )
            """)
    boolean existsByUsername(String username);

    @Insert("""
            INSERT INTO users (username, password_hash, role)
            VALUES (#{username}, #{passwordHash}, #{role})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int save(User user);

    @Update("""
            update users set password_hash = #{passwordHash},
            updated_at =now()
            where username = #{username}
                """)
    int updatePasswordByUsername(String username, String passwordHash);

}
