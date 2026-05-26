CREATE TABLE knowledge_base_members
(
    id                BIGSERIAL PRIMARY KEY,
    knowledge_base_id BIGINT      NOT NULL REFERENCES knowledge_bases (id) ON DELETE CASCADE,
    user_id           BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role              VARCHAR(16) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_knowledge_base_members_kb_user UNIQUE (knowledge_base_id, user_id),
    CONSTRAINT chk_knowledge_base_members_role CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER'))
);

CREATE INDEX idx_knowledge_base_members_user_id
    ON knowledge_base_members (user_id);

CREATE INDEX idx_knowledge_base_members_kb_role
    ON knowledge_base_members (knowledge_base_id, role);

-- 历史知识库在阶段 12 前只靠 created_by 表示所有者，这里补齐 OWNER 成员记录。
INSERT INTO knowledge_base_members (knowledge_base_id, user_id, role)
SELECT id, created_by, 'OWNER'
FROM knowledge_bases
WHERE created_by IS NOT NULL ON CONFLICT (knowledge_base_id, user_id) DO NOTHING;