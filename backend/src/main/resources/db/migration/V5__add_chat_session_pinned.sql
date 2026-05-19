ALTER TABLE chat_sessions
    ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_chat_sessions_user_kb_pinned_updated
    ON chat_sessions (user_id, knowledge_base_id, pinned DESC, updated_at DESC, id DESC);