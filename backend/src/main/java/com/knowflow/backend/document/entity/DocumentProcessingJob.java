package com.knowflow.backend.document.entity;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class DocumentProcessingJob {
    private Long id;
    private Long documentId;
    private Long knowledgeBaseId;
    private Long requestedBy;
    /**
     * Processing type for this attempt. UPLOAD_INDEX means indexing a newly uploaded source;
     * REPROCESS means rebuilding chunks for an existing document.
     */
    private String jobType;
    /**
     * Durable task status shown to the frontend: QUEUED, RUNNING, SUCCEEDED, FAILED, or CANCELED.
     * This is separate from documents.status so users can see the latest attempt progress/history.
     */
    private String status;
    /**
     * Coarse progress value from 0 to 100. Stage 17 uses fixed milestones rather than fake byte-level
     * progress because parsers do not expose reliable partial progress.
     */
    private Integer progressPercent;
    /**
     * Short machine-readable stage such as EXTRACT_TEXT or WRITE_CHUNKS.
     */
    private String stage;
    /**
     * Safe user-facing progress message. It must not contain file paths, API keys, or stack traces.
     */
    private String message;
    /**
     * Safe user-facing failure reason. documents.error_message mirrors this for existing UI paths.
     */
    private String errorMessage;
    private OffsetDateTime startedAt;
    private OffsetDateTime finishedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
