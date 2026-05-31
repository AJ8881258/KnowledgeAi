ALTER TABLE users
    ADD COLUMN avatar_object_key TEXT,
    ADD COLUMN avatar_updated_at TIMESTAMPTZ;

CREATE INDEX idx_users_avatar_updated
    ON users (id, avatar_updated_at);
