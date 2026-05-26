package com.knowflow.backend.knowledgebase.repository;

import com.knowflow.backend.knowledgebase.entity.KnowledgeBaseMember;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;
import java.util.Optional;

@Mapper
public interface KnowledgeBaseMemberRepository {

    @Select("""
            select m.id, m.knowledge_base_id, m.user_id, u.username,
                   m.role, m.created_at, m.updated_at
            from knowledge_base_members m
            join users u on u.id = m.user_id
            where m.knowledge_base_id = #{knowledgeBaseId}
            order by
                case m.role when 'OWNER' then 0 when 'EDITOR' then 1 else 2 end,
                lower(u.username),
                m.id
            """)
    List<KnowledgeBaseMember> findAllByKnowledgeBaseId(Long knowledgeBaseId);

    @Select("""
            select m.id, m.knowledge_base_id, m.user_id, u.username,
                   m.role, m.created_at, m.updated_at
            from knowledge_base_members m
            join users u on u.id = m.user_id
            where m.knowledge_base_id = #{knowledgeBaseId}
              and m.user_id = #{userId}
            """)
    Optional<KnowledgeBaseMember> findByKnowledgeBaseIdAndUserId(
            @Param("knowledgeBaseId") Long knowledgeBaseId,
            @Param("userId") Long userId);

    @Select("""
            select m.id, m.knowledge_base_id, m.user_id, u.username,
                   m.role, m.created_at, m.updated_at
            from knowledge_base_members m
            join users u on u.id = m.user_id
            where m.knowledge_base_id = #{knowledgeBaseId}
              and m.id = #{id}
            """)
    Optional<KnowledgeBaseMember> findByIdAndKnowledgeBaseId(
            @Param("id") Long id,
            @Param("knowledgeBaseId") Long knowledgeBaseId);

    @Insert("""
            insert into knowledge_base_members (knowledge_base_id, user_id, role)
            values (#{knowledgeBaseId}, #{userId}, #{role})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int insert(KnowledgeBaseMember member);

    @Update("""
            update knowledge_base_members
            set role = #{role},
                updated_at = now()
            where id = #{id}
              and knowledge_base_id = #{knowledgeBaseId}
            """)
    int updateRoleByIdAndKnowledgeBaseId(
            @Param("id") Long id,
            @Param("knowledgeBaseId") Long knowledgeBaseId,
            @Param("role") String role);

    @Delete("""
            delete from knowledge_base_members
            where id = #{id}
              and knowledge_base_id = #{knowledgeBaseId}
            """)
    int deleteByIdAndKnowledgeBaseId(
            @Param("id") Long id,
            @Param("knowledgeBaseId") Long knowledgeBaseId);
}
