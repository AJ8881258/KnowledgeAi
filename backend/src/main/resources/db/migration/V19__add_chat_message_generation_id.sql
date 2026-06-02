ALTER TABLE chat_messages
    ADD COLUMN generation_id VARCHAR(64);

CREATE INDEX idx_chat_messages_session_generation_role
    ON chat_messages (session_id, generation_id, role);
