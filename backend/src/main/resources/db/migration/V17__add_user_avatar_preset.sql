ALTER TABLE users
    ADD COLUMN avatar_preset_id VARCHAR(32);

CREATE INDEX idx_users_avatar_preset
    ON users (id, avatar_preset_id);
