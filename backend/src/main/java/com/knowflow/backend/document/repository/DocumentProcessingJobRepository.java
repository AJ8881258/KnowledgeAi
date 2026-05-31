package com.knowflow.backend.document.repository;

import com.knowflow.backend.document.entity.DocumentProcessingJob;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;
import java.util.Optional;

@Mapper
public interface DocumentProcessingJobRepository {

    /**
     * Creates a durable job row before any parsing/chunking work starts.
     *
     * @param job job_type identifies UPLOAD_INDEX or REPROCESS, requested_by is the user who triggered it
     * @return inserted row count
     */
    @Insert("""
            insert into document_processing_jobs (
                document_id,
                knowledge_base_id,
                requested_by,
                job_type,
                status,
                progress_percent,
                stage,
                message,
                error_message
            )
            values (
                #{documentId},
                #{knowledgeBaseId},
                #{requestedBy},
                #{jobType},
                #{status},
                #{progressPercent},
                #{stage},
                #{message},
                #{errorMessage}
            )
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    int insert(DocumentProcessingJob job);

    @Select("""
            select id, document_id, knowledge_base_id, requested_by, job_type, status,
                   progress_percent, stage, message, error_message,
                   started_at, finished_at, created_at, updated_at
            from document_processing_jobs
            where id = #{id}
            """)
    Optional<DocumentProcessingJob> findById(Long id);

    @Select("""
            select j.id, j.document_id, j.knowledge_base_id, j.requested_by, j.job_type, j.status,
                   j.progress_percent, j.stage, j.message, j.error_message,
                   j.started_at, j.finished_at, j.created_at, j.updated_at
            from document_processing_jobs j
            join knowledge_bases kb on kb.id = j.knowledge_base_id
            left join knowledge_base_members m
              on m.knowledge_base_id = kb.id
             and m.user_id = #{userId}
            where j.id = #{id}
              and (kb.created_by = #{userId} or m.user_id = #{userId})
            """)
    Optional<DocumentProcessingJob> findAccessibleById(
            @Param("id") Long id,
            @Param("userId") Long userId);

    @Select("""
            select j.id, j.document_id, j.knowledge_base_id, j.requested_by, j.job_type, j.status,
                   j.progress_percent, j.stage, j.message, j.error_message,
                   j.started_at, j.finished_at, j.created_at, j.updated_at
            from document_processing_jobs j
            join knowledge_bases kb on kb.id = j.knowledge_base_id
            left join knowledge_base_members m
              on m.knowledge_base_id = kb.id
             and m.user_id = #{userId}
            where j.knowledge_base_id = #{knowledgeBaseId}
              and (kb.created_by = #{userId} or m.user_id = #{userId})
            order by
                case when j.status in ('QUEUED', 'RUNNING') then 0 else 1 end,
                j.updated_at desc,
                j.id desc
            limit #{limit}
            """)
    List<DocumentProcessingJob> findRecentAccessibleByKnowledgeBaseId(
            @Param("knowledgeBaseId") Long knowledgeBaseId,
            @Param("userId") Long userId,
            @Param("limit") Integer limit);

    @Select("""
            select j.id, j.document_id, j.knowledge_base_id, j.requested_by, j.job_type, j.status,
                   j.progress_percent, j.stage, j.message, j.error_message,
                   j.started_at, j.finished_at, j.created_at, j.updated_at
            from document_processing_jobs j
            join knowledge_bases kb on kb.id = j.knowledge_base_id
            left join knowledge_base_members m
              on m.knowledge_base_id = kb.id
             and m.user_id = #{userId}
            where j.document_id = #{documentId}
              and (kb.created_by = #{userId} or m.user_id = #{userId})
            order by j.updated_at desc, j.id desc
            limit #{limit}
            """)
    List<DocumentProcessingJob> findRecentAccessibleByDocumentId(
            @Param("documentId") Long documentId,
            @Param("userId") Long userId,
            @Param("limit") Integer limit);

    /**
     * Marks a queued job as running and records the first visible progress stage.
     *
     * @param id job ID
     * @param progressPercent fixed coarse progress milestone
     * @param stage short stage code
     * @param message safe user-facing message
     * @return updated row count
     */
    @Update("""
            update document_processing_jobs
            set status = 'RUNNING',
                progress_percent = #{progressPercent},
                stage = #{stage},
                message = #{message},
                error_message = null,
                started_at = coalesce(started_at, now()),
                updated_at = now()
            where id = #{id}
            """)
    int markRunning(
            @Param("id") Long id,
            @Param("progressPercent") int progressPercent,
            @Param("stage") String stage,
            @Param("message") String message);

    /**
     * Updates progress while the task is still active.
     */
    @Update("""
            update document_processing_jobs
            set progress_percent = #{progressPercent},
                stage = #{stage},
                message = #{message},
                updated_at = now()
            where id = #{id}
              and status in ('QUEUED', 'RUNNING')
            """)
    int updateProgress(
            @Param("id") Long id,
            @Param("progressPercent") int progressPercent,
            @Param("stage") String stage,
            @Param("message") String message);

    /**
     * Completes a job after chunks and document status have been persisted.
     */
    @Update("""
            update document_processing_jobs
            set status = 'SUCCEEDED',
                progress_percent = 100,
                stage = #{stage},
                message = #{message},
                error_message = null,
                finished_at = now(),
                updated_at = now()
            where id = #{id}
            """)
    int markSucceeded(
            @Param("id") Long id,
            @Param("stage") String stage,
            @Param("message") String message);

    /**
     * Fails a job with a sanitized product error. The same error is mirrored to documents.error_message.
     */
    @Update("""
            update document_processing_jobs
            set status = 'FAILED',
                progress_percent = 100,
                stage = #{stage},
                message = #{message},
                error_message = #{errorMessage},
                finished_at = now(),
                updated_at = now()
            where id = #{id}
            """)
    int markFailed(
            @Param("id") Long id,
            @Param("stage") String stage,
            @Param("message") String message,
            @Param("errorMessage") String errorMessage);
}
