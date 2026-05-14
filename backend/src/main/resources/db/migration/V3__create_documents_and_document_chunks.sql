
-- V1 里已经有早期 documents 表，所以这里不要重新 CREATE documents。
-- 本迁移负责把旧 documents 表升级成文档上传第一阶段需要的结构。
ALTER TABLE documents
RENAME COLUMN filename TO original_filename;

ALTER TABLE documents
RENAME COLUMN file_type TO content_type;

ALTER TABLE documents
RENAME COLUMN file_size TO size_bytes;

ALTER TABLE documents
RENAME COLUMN uploaded_by TO created_by;

ALTER TABLE documents
ADD COLUMN error_message TEXT;

ALTER TABLE documents
DROP COLUMN storage_path;

ALTER TABLE documents
ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

ALTER TABLE documents
ADD CONSTRAINT documents_created_by_fkey
FOREIGN KEY (created_by) REFERENCES users (id);

CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    knowledge_base_id BIGINT NOT NULL REFERENCES knowledge_bases (id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    char_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_knowledge_base_id ON documents (knowledge_base_id);
CREATE INDEX idx_documents_created_by ON documents (created_by);
CREATE INDEX idx_document_chunks_document_id ON document_chunks (document_id);
CREATE INDEX idx_document_chunks_knowledge_base_id ON document_chunks (knowledge_base_id);

ALTER TABLE document_chunks
ADD CONSTRAINT uq_document_chunks_document_id_chunk_index
UNIQUE (document_id, chunk_index);
