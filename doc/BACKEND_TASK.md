# 后端任务书：阶段 7 联调支撑与接口稳定性

本任务书是后端会话的固定入口。后续每个阶段都复用本文件，由文档会话实时更新当前任务。用户正在练习后端，默认不要直接修改后端源码；请给除导入部分包以外的完整代码、文件相对路径、实现顺序、文件清单、关键注释和测试命令。

## 当前目标

阶段 6：RAG 问答 MVP 已完成。当前进入阶段 7：前端体验完善。

阶段 7 后端不默认新增大功能，主要职责是支撑前端体验整理和演示稳定性：

1. 校验阶段 6 已实现接口与 `doc/API.md` 一致。
2. 保证认证、知识库、文档、检索、Chat/RAG 接口的错误响应稳定。
3. 配合前端清理假数据时，确认哪些数据可以由现有接口提供，哪些暂时不能提供。
4. 如果前端体验确实需要小接口补强，先向用户说明用途和影响，再给完整代码方案。

本阶段不做 embedding、不做 pgvector、不做流式输出、不做多模型选择、不做复杂权限系统、不做 Agent 工作流。

## 本轮实施状态

阶段 7 后端联调支撑已完成代码级验收。

已完成：

- `GET /api/auth/me`：获取当前登录用户。
- `GET /api/health`：健康检查，已放行，无需登录。
- 缺少上传文件字段时返回 `400`。
- 模型调用失败返回 `AI model call failed`，不泄露 API key、base URL 或 model。
- 删除文档级联删除 chunks。
- 删除会话级联删除 messages 和 sources。
- 401、400、404 等稳定性场景已覆盖测试。

验证结果：

- `cd backend && .\mvnw.cmd test` 通过。
- 共 11 个测试通过，其中 `Stage7ApiStabilityTests` 覆盖阶段 7 稳定性场景。

## 必读规则

- 注意：我是后端学习阶段，你不要直接改后端源码。请给我除了导入部分包其他的完整代码、文件相对路径、实现顺序、文件清单、关键注释和测试命令，我自己写代码。
- 后端会话必须先读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文件。
- 不要修改已经执行过的 Flyway 迁移文件；表结构变化只能新增迁移。
- 任何接口变化必须提醒文档会话同步 `doc/API.md`。
- 不要为了前端展示方便绕过 JWT 用户隔离。
- 不要把模型 API key、base URL 或敏感错误信息返回给前端。

## 当前接口基线

阶段 7 默认基于以下已完成能力做稳定性检查，不主动改变接口契约：

| 模块 | 已有能力 |
|---|---|
| Auth | 注册、登录、重置密码、当前用户、JWT |
| KnowledgeBase | 知识库列表、详情、创建、修改、删除、用户隔离 |
| Document | 上传、解析、切片、列表、详情、删除、chunk 查询 |
| Search | `POST /api/knowledge-bases/{knowledgeBaseId}/search` |
| Chat/RAG | 创建会话、会话列表、修改会话、删除会话、消息列表、发送问题、引用来源 |

阶段 7 暂不实现：

- `POST /api/chat/sessions/{sessionId}/messages/stream`
- embedding
- pgvector
- 多模型选择
- 复杂权限系统
- 后台管理系统

## 任务 1：接口稳定性核对

目标：确认前端阶段 7 依赖的接口都能稳定返回，错误状态可被前端正确展示。

检查范围：

- 登录成功返回 `tokenType` 和 `accessToken`。
- 未登录访问受保护接口返回 `401`。
- 访问不存在或不属于当前用户的知识库、文档、会话返回 `404`。
- 参数为空或非法时返回 `400`，不要走到数据库或模型调用后才失败。
- 模型调用失败时返回明确错误，不泄露密钥。
- 删除知识库、文档、会话后，相关从表数据按设计级联删除。

建议测试命令：

```powershell
cd backend
.\mvnw.cmd test
```

如需手动联调，优先验证：

```http
POST /api/auth/login
GET /api/knowledge-bases
GET /api/knowledge-bases/{knowledgeBaseId}
GET /api/knowledge-bases/{knowledgeBaseId}/documents
POST /api/knowledge-bases/{knowledgeBaseId}/search
GET /api/knowledge-bases/{knowledgeBaseId}/chat/sessions
GET /api/chat/sessions/{sessionId}/messages
POST /api/chat/sessions/{sessionId}/messages
PATCH /api/chat/sessions/{sessionId}
DELETE /api/chat/sessions/{sessionId}
```

## 任务 2：前端真实数据支撑判断

目标：前端会在阶段 7 清理 mock 展示。后端需要判断现有接口能否支撑这些真实数据。

需要判断的数据：

- Dashboard 总知识库数量。
- Dashboard 最近知识库。
- Dashboard 最近会话或最近问答。
- 每个知识库的文档数量、chunk 数、最近更新时间。
- Documents 页面是否需要跨知识库文档列表。
- Chat 页面是否需要跨知识库会话列表。

默认处理策略：

- 如果现有接口已经能提供，就告诉前端如何组合使用。
- 如果现有接口不能提供，不要让前端伪造真实数据；先让前端显示空状态或低噪声占位。
- 如果确实需要新增小接口，先列出接口目的、响应字段、是否会增加数据库查询复杂度，再等用户确认。

## 可选补强接口

以下接口不是阶段 7 默认必须做，只有当前端体验确认需要时才实现。`GET /api/auth/me` 和 `GET /api/health` 已在本轮实现，不再属于可选接口。

### 已实现 1：当前用户接口

用途：前端刷新后从后端确认当前 token 对应用户，减少只依赖本地持久化状态的问题。

候选接口：

```http
GET /api/auth/me
```

候选响应：

```json
{
  "id": 2,
  "username": "WuLong",
  "role": "USER"
}
```

### 已实现 2：健康检查接口

用途：本地开发和演示时快速确认后端启动。

候选接口：

```http
GET /api/health
```

候选响应：

```json
{
  "status": "UP"
}
```

### 可选：Dashboard 汇总接口

用途：如果前端 Dashboard 无法用现有接口合理展示真实统计，可以新增汇总接口。此接口不是默认任务，避免为了首页统计提前扩大后端范围。

候选接口：

```http
GET /api/dashboard/summary
```

候选响应：

```json
{
  "knowledgeBaseCount": 3,
  "documentCount": 12,
  "indexedDocumentCount": 10,
  "chatSessionCount": 5,
  "recentKnowledgeBases": [],
  "recentChatSessions": []
}
```

规则：

- 必须按当前 JWT 用户隔离。
- 不返回其他用户数据。
- 如果实现，必须同步 `doc/API.md`。

## 注释要求

只在关键逻辑上加注释：

- 权限校验：知识库、文档、会话必须属于当前 JWT 用户。
- 状态流转：文档上传、解析、切片、失败状态要清楚。
- 事务边界：删除知识库、文档、会话时保持数据一致。
- 检索边界：搜索只能查当前用户自己的 `INDEXED` 文档 chunks。
- 模型调用失败处理：不泄露 API key，不把供应商原始敏感错误直接返回前端。

## 验收标准

- `cd backend && .\mvnw.cmd test` 通过。
- 阶段 6 已有 Chat/RAG 接口仍能正常使用。
- 未登录、无权限、不存在资源、非法参数都有稳定状态码。
- 前端阶段 7 需要的真实数据来源被明确标记为“已有接口可支持”或“需要后端补强”。
- 不为了前端展示伪造后端数据。
- 如新增接口，必须提供文件相对路径、除导入外完整代码、关键注释、测试命令，并提醒同步 `doc/API.md`。
