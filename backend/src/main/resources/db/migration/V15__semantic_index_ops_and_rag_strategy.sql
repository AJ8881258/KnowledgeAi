-- Stage 19 makes retrieval strategy user-configurable and adds a semantic-only
-- rebuild job type. The new columns are defaults so existing users keep the
-- Stage 18 HYBRID behavior without a manual data migration.
ALTER TABLE user_rag_settings
    ADD COLUMN IF NOT EXISTS retrieval_mode VARCHAR(32) NOT NULL DEFAULT 'HYBRID',
    ADD COLUMN IF NOT EXISTS semantic_weight DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    ADD COLUMN IF NOT EXISTS fulltext_weight DOUBLE PRECISION NOT NULL DEFAULT 0.3;

ALTER TABLE user_rag_settings
    DROP CONSTRAINT IF EXISTS chk_user_rag_settings_retrieval_mode,
    ADD CONSTRAINT chk_user_rag_settings_retrieval_mode
        CHECK (retrieval_mode IN ('HYBRID', 'FULLTEXT'));

ALTER TABLE user_rag_settings
    DROP CONSTRAINT IF EXISTS chk_user_rag_settings_semantic_weight,
    ADD CONSTRAINT chk_user_rag_settings_semantic_weight
        CHECK (semantic_weight >= 0 AND semantic_weight <= 1);

ALTER TABLE user_rag_settings
    DROP CONSTRAINT IF EXISTS chk_user_rag_settings_fulltext_weight,
    ADD CONSTRAINT chk_user_rag_settings_fulltext_weight
        CHECK (fulltext_weight >= 0 AND fulltext_weight <= 1);

ALTER TABLE user_rag_settings
    DROP CONSTRAINT IF EXISTS chk_user_rag_settings_weight_sum,
    ADD CONSTRAINT chk_user_rag_settings_weight_sum
        CHECK (abs((semantic_weight + fulltext_weight) - 1.0) <= 0.000001);

ALTER TABLE document_processing_jobs
    DROP CONSTRAINT IF EXISTS chk_document_processing_jobs_type,
    ADD CONSTRAINT chk_document_processing_jobs_type
        CHECK (job_type IN ('UPLOAD_INDEX', 'REPROCESS', 'REBUILD_SEMANTIC_INDEX'));
