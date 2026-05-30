-- Stage 16 keeps the original upload source in the documents row so failed documents
-- can be reprocessed without depending on previously created chunks.
ALTER TABLE documents
ADD COLUMN source_bytes BYTEA,
ADD COLUMN source_text TEXT,
ADD COLUMN source_text_updated_at TIMESTAMPTZ;
