package com.knowflow.backend.knowledgebase;

import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

// Repository 是数据访问层。这里使用 MyBatis Mapper 手写 SQL 查询数据库。
@Mapper
public interface KnowledgeBaseRepository {

        // 查找所有知识库
        @Select("""
                        SELECT id, name, description, status,featured,theme_id, created_by, created_at, updated_at
                        FROM knowledge_bases
                        ORDER BY id
                        """)
        List<KnowledgeBase> findAll();

        // 查找某个知识库
        @Select("""
                        SELECT id, name, description, status,featured,theme_id, created_by, created_at, updated_at
                        FROM knowledge_bases
                        WHERE id = #{id}
                        """)
        Optional<KnowledgeBase> findById(Long id);

        // 查找某个用户创建的知识库
        @Select("""
                        select id,name,description,status,featured,theme_id,created_by,created_at,updated_at
                        from knowledge_bases
                        where created_by=#{userId}
                        order by id
                        """)
        List<KnowledgeBase> findAllByCreatedBy(Long userId);

        // find a knowledge_base by id and created by
        @Select("""
                        select id,name,description,status,featured,theme_id,created_by,created_at,updated_at
                        from knowledge_bases
                        where id = #{id} and
                        created_by =#{userId}
                        """)
        Optional<KnowledgeBase> findByIdAndCreatedBy(@Param("id") Long id, @Param("userId") Long userId);

        // 创建知识库
        @Insert("""
                        insert into knowledge_bases (name,description,status,featured,theme_id,created_by)
                        values (#{name},#{description},#{status},#{featured},#{themeId},#{createdBy})
                        """)
        @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
        int insert(KnowledgeBase knowledgeBase);

        // 更新知识库
        @Update("""
                        update knowledge_bases set
                        name=#{name},
                        description=#{description},
                        featured=#{featured},
                        theme_id=#{themeId},
                        updated_at = now()
                        where id = #{id}
                        and created_by = #{userId}
                        """)
        int updateByIdAndCreatedBy(
                        @Param("id") Long id,
                        @Param("userId") Long userId,
                        @Param("name") String name,
                        @Param("description") String description,
                        @Param("featured") Boolean featured,
                        @Param("themeId") String themeId);

        // 删除知识库
        @Delete("""
                        delete from knowledge_bases
                        where id = #{id}
                        and created_by = #{userId}
                        """)
        int deleteByIdAndCreatedBy(@Param("id") Long id, @Param("userId") Long userId);
}
