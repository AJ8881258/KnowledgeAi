ALTER TABLE documents
ADD COLUMN summary TEXT;

ALTER TABLE documents
ADD COLUMN summary_updated_at TIMESTAMPTZ;
