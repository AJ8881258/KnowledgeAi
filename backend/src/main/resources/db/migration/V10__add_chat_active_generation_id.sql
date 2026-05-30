ALTER TABLE chat_sessions
    ADD COLUMN active_generation_id VARCHAR(64);

CREATE INDEX idx_chat_sessions_active_generation
    ON chat_sessions (id, user_id, active_generation_id);
