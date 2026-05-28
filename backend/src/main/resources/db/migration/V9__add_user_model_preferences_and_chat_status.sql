CREATE TABLE user_model_settings
(
    user_id           BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    base_url          TEXT         NOT NULL,
    encrypted_api_key TEXT,
    model             VARCHAR(255) NOT NULL,
    timeout_seconds   INTEGER      NOT NULL DEFAULT 60,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_preferences
(
    user_id    BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    language   VARCHAR(32)  NOT NULL DEFAULT 'zh-CN',
    timezone   VARCHAR(128) NOT NULL DEFAULT 'Asia/Shanghai',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE chat_sessions
    ADD COLUMN unread BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
    ADD COLUMN last_error_message TEXT;

CREATE INDEX idx_chat_sessions_user_unread_status
    ON chat_sessions (user_id, unread, status, updated_at DESC, id DESC);

CREATE INDEX idx_chat_messages_session_role_created
    ON chat_messages (session_id, role, created_at);
