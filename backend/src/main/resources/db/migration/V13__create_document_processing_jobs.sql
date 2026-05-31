-- Stage 17 records every document processing attempt as a durable job.
-- The job table is intentionally separate from documents because one document can be uploaded once
-- and reprocessed many times; documents.status remains the latest materialized search state.
CREATE TABLE document_processing_jobs (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    knowledge_base_id BIGINT NOT NULL REFERENCES knowledge_bases (id) ON DELETE CASCADE,
    requested_by BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    job_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    stage VARCHAR(64),
    message TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_document_processing_jobs_type
        CHECK (job_type IN ('UPLOAD_INDEX', 'REPROCESS')),
    CONSTRAINT chk_document_processing_jobs_status
        CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED')),
    CONSTRAINT chk_document_processing_jobs_progress
        CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

CREATE INDEX idx_document_processing_jobs_document_id
    ON document_processing_jobs (document_id);

CREATE INDEX idx_document_processing_jobs_knowledge_base_status
    ON document_processing_jobs (knowledge_base_id, status, updated_at DESC);

CREATE INDEX idx_document_processing_jobs_requested_by
    ON document_processing_jobs (requested_by);
