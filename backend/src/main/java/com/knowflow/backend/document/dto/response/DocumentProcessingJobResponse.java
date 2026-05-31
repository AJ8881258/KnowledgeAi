package com.knowflow.backend.document.dto.response;

import com.knowflow.backend.document.entity.DocumentProcessingJob;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class DocumentProcessingJobResponse {
    private Long id;
    private Long documentId;
    private Long knowledgeBaseId;
    private Long requestedBy;
    private String jobType;
    private String status;
    private Integer progressPercent;
    private String stage;
    private String message;
    private String errorMessage;
    private OffsetDateTime startedAt;
    private OffsetDateTime finishedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    /**
     * Public representation of a document processing job.
     *
     * @param job durable task row; message and errorMessage must already be sanitized by the service
     */
    public DocumentProcessingJobResponse(DocumentProcessingJob job) {
        this.id = job.getId();
        this.documentId = job.getDocumentId();
        this.knowledgeBaseId = job.getKnowledgeBaseId();
        this.requestedBy = job.getRequestedBy();
        this.jobType = job.getJobType();
        this.status = job.getStatus();
        this.progressPercent = job.getProgressPercent();
        this.stage = job.getStage();
        this.message = job.getMessage();
        this.errorMessage = job.getErrorMessage();
        this.startedAt = job.getStartedAt();
        this.finishedAt = job.getFinishedAt();
        this.createdAt = job.getCreatedAt();
        this.updatedAt = job.getUpdatedAt();
    }
}
