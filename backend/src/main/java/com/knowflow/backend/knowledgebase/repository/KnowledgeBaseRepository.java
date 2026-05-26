package com.knowflow.backend.knowledgebase.repository;

import java.util.List;
import java.util.Optional;

import com.knowflow.backend.knowledgebase.entity.KnowledgeBase;
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

    /**
     * 查询所有知识库
     *
     * @return
     */
    @Select("""
            SELECT id, name, description, status,featured,theme_id, created_by, created_at, updated_at
            FROM knowledge_bases
            ORDER BY id
            """)
    List<KnowledgeBase> findAll();

    /**
     * 根据 ID 查询知识库
     *
     * @param id
     * @return
     */
    @Select("""
            SELECT id, name, description, status,featured,theme_id, created_by, created_at, updated_at
            FROM knowledge_bases
            WHERE id = #{id}
            """)
    Optional<KnowledgeBase> findById(Long id);

    /**
     * 查询某个用户可以访问的知识库
     *
     * @param userId
     * @return
     */
    @Select("""
            select
            kb.id,
            kb.name,
            kb.description,
            kb.status,
            kb.featured,
            kb.theme_id,
            kb.created_by,
            kb.created_at,
            kb.updated_at,
            case
                when kb.created_by = #{userId} then 'OWNER'
                else m.role
            end as access_role,
            (kb.created_by = #{userId}) as owned_by_me,
            (kb.created_by <> #{userId}) as shared_with_me from 
            knowledge_bases kb left join knowledge_base_members m on 
            m.knowledge_base_id = kb.id and m.user_id = #{userId}
            where kb.created_by = #{userId} or m.user_id = #{userId}
            order by kb.id
            """)
    List<KnowledgeBase> findAllAccessibleByUserId(Long userId);

    /**
     * 查询某个用户可以访问的知识库详情
     *
     * @param id
     * @param userId
     * @return
     */
    @Select("""
            select
                kb.id,
                kb.name,
                kb.description,
                kb.status,
                kb.featured,
                kb.theme_id,
                kb.created_by,
                kb.created_at,
                kb.updated_at,
                case
                    when kb.created_by = #{userId} then 'OWNER'
                    else m.role
                end as access_role,
                (kb.created_by = #{userId}) as owned_by_me,
                (kb.created_by <> #{userId}) as shared_with_me
            from knowledge_bases kb
            left join knowledge_base_members m
              on m.knowledge_base_id = kb.id
             and m.user_id = #{userId}
            where kb.id = #{id}
              and (kb.created_by = #{userId} or m.user_id = #{userId})
            """)
    Optional<KnowledgeBase> findAccessibleById(
            @Param("id") Long id,
            @Param("userId") Long userId);

    /**
     * 查询某个用户创建的知识库
     *
     * @param userId
     * @return
     */
    @Select("""
            select id,name,description,status,featured,theme_id,created_by,created_at,updated_at
            from knowledge_bases
            where created_by=#{userId}
            order by id
            """)
    List<KnowledgeBase> findAllByCreatedBy(Long userId);

    /**
     * 根据 ID 和创建人 ID 查询知识库
     *
     * @param id
     * @param userId
     * @return
     */
    @Select("""
            select id,name,description,status,featured,theme_id,created_by,created_at,updated_at
            from knowledge_bases
            where id = #{id} and
            created_by =#{userId}
            """)
    Optional<KnowledgeBase> findByIdAndCreatedBy(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 创建知识库
     *
     * @param knowledgeBase
     * @return
     */
    @Insert("""
            insert into knowledge_bases (name,description,status,featured,theme_id,created_by)
            values (#{name},#{description},#{status},#{featured},#{themeId},#{createdBy})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int insert(KnowledgeBase knowledgeBase);

    /**
     * 更新知识库
     * @param id
     * @param name
     * @param description
     * @param featured
     * @param themeId
     * @return
     */
    @Update("""
            update knowledge_bases
            set name = #{name},
                description = #{description},
                featured = #{featured},
                theme_id = #{themeId},
                updated_at = now()
            where id = #{id}
            """)
    int updateById(
            @Param("id") Long id,
            @Param("name") String name,
            @Param("description") String description,
            @Param("featured") Boolean featured,
            @Param("themeId") String themeId);

    /**
     * 更新知识库
     *
     * @param id
     * @param userId
     * @param name
     * @param description
     * @param featured
     * @param themeId
     * @return
     */
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

    /**
     * 删除知识库
     *
     * @param id
     * @return
     */
    @Delete("""
                delete  from knowledge_bases where id = #{id}
            """)
    int deleteById(Long id);

    /**
     * 删除知识库
     *
     * @param id
     * @param userId
     * @return
     */
    @Delete("""
            delete from knowledge_bases
            where id = #{id}
            and created_by = #{userId}
            """)
    int deleteByIdAndCreatedBy(@Param("id") Long id, @Param("userId") Long userId);
}
