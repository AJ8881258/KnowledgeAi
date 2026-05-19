CREATE TABLE chat_message_sources
(
    id            BIGSERIAL PRIMARY KEY,
    message_id    BIGINT           NOT NULL REFERENCES chat_messages (id) ON DELETE CASCADE,
    document_id   BIGINT           NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    document_name VARCHAR(255)     NOT NULL,
    chunk_id      BIGINT           NOT NULL REFERENCES document_chunks (id) ON DELETE CASCADE,
    chunk_index   INTEGER          NOT NULL,
    content       TEXT             NOT NULL,
    score         DOUBLE PRECISION NOT NULL,
    created_at    TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_message_sources_message_id ON chat_message_sources (message_id);