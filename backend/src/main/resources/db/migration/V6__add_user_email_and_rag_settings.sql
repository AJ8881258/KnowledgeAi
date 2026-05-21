ALTER TABLE users
    ADD COLUMN email VARCHAR(254);

CREATE UNIQUE INDEX uq_users_email_lower_not_null
    ON users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE user_rag_settings
(
    user_id            BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    top_k              INTEGER          NOT NULL DEFAULT 5,
    max_context_chunks INTEGER          NOT NULL DEFAULT 5,
    temperature        DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    created_at         TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ      NOT NULL DEFAULT now(),
    CONSTRAINT chk_user_rag_settings_top_k
        CHECK (top_k >= 1 AND top_k <= 20),
    CONSTRAINT chk_user_rag_settings_max_context_chunks
        CHECK (max_context_chunks >= 1 AND max_context_chunks <= 20),
    CONSTRAINT chk_user_rag_settings_temperature
        CHECK (temperature >= 0 AND temperature <= 2)
);