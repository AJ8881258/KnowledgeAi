# 后端任务书：Chat 会话管理增强

本任务书是后端会话的固定入口。后续每个阶段都复用本文件，由文档会话实时更新当前任务。用户正在练习后端，默认不要直接修改后端源码；请给除导入部分包以外的完整代码、文件相对路径、实现顺序、文件清单、关键注释和测试命令。

## 当前目标

在阶段 6 RAG 问答基础接口已经跑通后，补齐 Chat 会话管理能力，支撑前端会话编辑：

1. 修复会话消息查询 SQL 表名问题，确保 `GET /api/chat/sessions/{sessionId}/messages` 稳定可用。
2. 给会话增加重命名能力。
3. 给会话增加删除能力。
4. 给会话增加置顶/取消置顶能力。

本轮不做流式输出、不做 embedding、不做 pgvector、不做多模型选择、不做复杂权限系统和 Agent 工作流。

## 接口范围

保留已有接口：

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/api/knowledge-bases/{knowledgeBaseId}/chat/sessions` | 创建会话 |
| `GET` | `/api/knowledge-bases/{knowledgeBaseId}/chat/sessions` | 获取知识库会话列表 |
| `GET` | `/api/chat/sessions/{sessionId}/messages` | 获取会话消息 |
| `POST` | `/api/chat/sessions/{sessionId}/messages` | 发送问题并获取回答 |

新增接口：

| 方法 | 路径 | 用途 |
|---|---|---|
| `PATCH` | `/api/chat/sessions/{sessionId}` | 重命名、置顶或取消置顶会话 |
| `DELETE` | `/api/chat/sessions/{sessionId}` | 删除会话 |

`POST /api/chat/sessions/{sessionId}/messages/stream` 暂不实现，只保留后续规划。

## 数据库变更

如果当前 `chat_sessions` 没有置顶字段，新增 Flyway 迁移，例如：

```sql
ALTER TABLE chat_sessions
    ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_chat_sessions_user_kb_pinned_updated
    ON chat_sessions (user_id, knowledge_base_id, pinned DESC, updated_at DESC, id DESC);
```

规则：

- 不要修改已经执行过的 Flyway 迁移文件。
- 新增迁移文件按当前版本顺序命名，例如 `V5__add_chat_session_pinned.sql`。
- 删除会话依赖 `chat_messages.session_id ON DELETE CASCADE`，消息来源依赖 `chat_message_sources.message_id ON DELETE CASCADE`。

## 文件建议

优先在现有 chat 包内扩展：

- `backend/src/main/java/com/knowflow/backend/chat/controller/ChatController.java`
- `backend/src/main/java/com/knowflow/backend/chat/service/ChatService.java`
- `backend/src/main/java/com/knowflow/backend/chat/repository/ChatSessionRepository.java`
- `backend/src/main/java/com/knowflow/backend/chat/repository/ChatMessageRepository.java`
- `backend/src/main/java/com/knowflow/backend/chat/entity/ChatSession.java`
- `backend/src/main/java/com/knowflow/backend/chat/dto/request/UpdateChatSessionRequest.java`
- `backend/src/main/java/com/knowflow/backend/chat/dto/response/ChatSessionResponse.java`
- 新增 Flyway 迁移文件。

## 实现顺序

1. 先修复消息查询 SQL。
   - `ChatMessageRepository` 查询消息时应 join `chat_sessions`，不是 `chat_session`。
   - 查询必须通过 `sessionId + userId` 限制当前用户，只能读自己的会话消息。
2. 增加 `chat_sessions.pinned` 字段。
   - Entity 和 Response 增加 `pinned`。
   - 会话列表排序改为 `pinned DESC, updated_at DESC, id DESC`。
3. 新增 `UpdateChatSessionRequest`。
   - 字段：`title`、`pinned`。
   - 两个字段都可选，但请求不能什么都不改。
4. 新增 `PATCH /api/chat/sessions/{sessionId}`。
   - 校验 session 属于当前 JWT 用户。
   - 如果传 `title`，trim 后不能为空，长度建议不超过 200。
   - 如果传 `pinned`，更新置顶状态。
   - 更新后返回最新 `ChatSessionResponse`。
5. 新增 `DELETE /api/chat/sessions/{sessionId}`。
   - 校验 session 属于当前 JWT 用户。
   - 删除会话。
   - 返回 `204 No Content`。
6. 保留发送消息接口现有 RAG 流程。
   - 不要为了会话管理改动 prompt、模型调用或 chunk 检索逻辑。

## 核心代码片段方向

修复消息查询：

```java
@Select("""
        select m.id, m.session_id, m.role, m.content, m.created_at
        from chat_messages m
        join chat_sessions s on s.id = m.session_id
        where m.session_id = #{sessionId}
          and s.user_id = #{userId}
        order by m.created_at asc, m.id asc
        """)
List<ChatMessage> findAllBySessionIdAndUserId(
        @Param("sessionId") Long sessionId,
        @Param("userId") Long userId
);
```

会话列表排序：

```java
@Select("""
        select id, title, knowledge_base_id, user_id, pinned, created_at, updated_at
        from chat_sessions
        where knowledge_base_id = #{knowledgeBaseId}
          and user_id = #{userId}
        order by pinned desc, updated_at desc, id desc
        """)
List<ChatSession> findAllByKnowledgeBaseIdAndUserId(
        @Param("knowledgeBaseId") Long knowledgeBaseId,
        @Param("userId") Long userId
);
```

更新会话核心逻辑：

```java
@Transactional
public ChatSessionResponse updateSession(Long sessionId, Long userId, UpdateChatSessionRequest request) {
    ChatSession session = getSessionOr404(sessionId, userId);

    String title = request == null ? null : request.getTitle();
    Boolean pinned = request == null ? null : request.getPinned();

    if (title == null && pinned == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No session field to update");
    }

    String normalizedTitle = null;
    if (title != null) {
        normalizedTitle = title.trim();
        if (normalizedTitle.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is empty");
        }
        if (normalizedTitle.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is too long");
        }
    }

    // 权限边界：update 语句必须同时带 sessionId 和 userId，避免越权修改别人的会话。
    int updatedRows = chatSessionRepository.updateSession(session.getId(), userId, normalizedTitle, pinned);
    if (updatedRows != 1) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat session not found");
    }

    return new ChatSessionResponse(getSessionOr404(session.getId(), userId));
}
```

删除会话核心逻辑：

```java
@Transactional
public void deleteSession(Long sessionId, Long userId) {
    getSessionOr404(sessionId, userId);

    // 删除会话会通过外键级联删除消息和消息引用来源，避免留下孤儿数据。
    int deletedRows = chatSessionRepository.deleteByIdAndUserId(sessionId, userId);
    if (deletedRows != 1) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat session not found");
    }
}
```

## 注释要求

只在关键逻辑上加注释：

- 权限校验：会话必须属于当前 JWT 用户。
- 事务边界：删除会话和更新会话应保持单次操作一致。
- 级联删除：删除会话依赖外键级联清理消息和引用来源。
- 置顶排序：置顶只影响会话列表排序，不改变消息时间线。
- 模型调用失败处理：保持现有逻辑，不泄露 API key。

## 验收标准

- `GET /api/chat/sessions/{sessionId}/messages` 不再因为 SQL 表名错误返回 500。
- 会话列表返回 `pinned` 字段。
- 会话列表排序为 `pinned desc -> updatedAt desc -> id desc`。
- `PATCH /api/chat/sessions/{sessionId}` 可以重命名会话。
- `PATCH /api/chat/sessions/{sessionId}` 可以置顶和取消置顶会话。
- `DELETE /api/chat/sessions/{sessionId}` 可以删除当前用户自己的会话。
- 删除会话后，对应消息和消息来源被级联删除。
- 用户不能查看、修改或删除其他用户的会话。
- `cd backend && .\mvnw.cmd test` 通过。
