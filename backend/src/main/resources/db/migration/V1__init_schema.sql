CREATE TABLE
    users (
        id BIGSERIAL PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now ()
    );

CREATE TABLE
    knowledge_bases (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        description TEXT,
        status VARCHAR(32) NOT NULL,
        created_by BIGINT REFERENCES users (id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now ()
    );

CREATE TABLE
    documents (
        id BIGSERIAL PRIMARY KEY,
        knowledge_base_id BIGINT NOT NULL REFERENCES knowledge_bases (id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        file_type VARCHAR(64),
        file_size BIGINT,
        status VARCHAR(32) NOT NULL,
        storage_path TEXT,
        uploaded_by BIGINT REFERENCES users (id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now ()
    );

CREATE TABLE
    chat_sessions (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        knowledge_base_id BIGINT REFERENCES knowledge_bases (id) ON DELETE SET NULL,
        user_id BIGINT REFERENCES users (id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now ()
    );

CREATE TABLE
    chat_messages (
        id BIGSERIAL PRIMARY KEY,
        session_id BIGINT NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
        role VARCHAR(32) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now ()
    );

INSERT INTO
    users (username, password_hash, role)
VALUES
    ('admin', '{noop}admin', 'ADMIN');

INSERT INTO
    knowledge_bases (name, description, status, created_by)
VALUES
    ('产品文档知识库', '用于产品功能、版本说明和用户手册问答。', 'ACTIVE', 1),
    ('技术支持知识库', '用于沉淀常见问题、排障步骤和内部支持经验。', 'ACTIVE', 1),
    ('企业制度知识库', '用于公司制度、流程规范和员工手册检索。', 'ACTIVE', 1);