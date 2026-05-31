CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(32) NOT NULL DEFAULT 'SKIPPED',
    ADD COLUMN IF NOT EXISTS embedding_error_message TEXT,
    ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS embedding vector,
    ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(32) NOT NULL DEFAULT 'SKIPPED',
    ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

ALTER TABLE chat_message_sources
    ADD COLUMN IF NOT EXISTS hybrid_score DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS fulltext_score DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS semantic_score DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS retrieval_mode VARCHAR(32);

UPDATE chat_message_sources
SET hybrid_score = COALESCE(hybrid_score, score),
    fulltext_score = COALESCE(fulltext_score, score),
    semantic_score = COALESCE(semantic_score, 0.0),
    retrieval_mode = COALESCE(retrieval_mode, 'FULLTEXT')
WHERE retrieval_mode IS NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_status
    ON document_chunks (knowledge_base_id, embedding_status);
