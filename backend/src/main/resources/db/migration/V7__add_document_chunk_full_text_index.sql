CREATE INDEX idx_document_chunks_content_fts_simple
    ON document_chunks
    USING GIN (to_tsvector('simple', content));
