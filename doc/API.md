# KnowFlow AI API 文档

## 基础信息

- Base URL: `http://localhost:8080`
- 请求体格式: `application/json`
- 当前认证状态: 登录和注册接口已实现；登录成功后会返回 JWT `accessToken`。
- 当前放行接口:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/reset-password`
  - `GET /api/health`
- 除放行接口外，业务接口需要登录，请求头必须携带：

```http
Authorization: Bearer <accessToken>
```

- 文档上传接口使用 `multipart/form-data`，其他文档查询和删除接口仍使用普通 HTTP 请求和 JSON 响应。

## 已实现接口

### 注册

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/auth/register` |
| 是否需要登录 | 否 |

请求示例：

```json
{
  "username": "WuLong",
  "password": "WuLong"
}
```

成功响应示例：

```json
{
  "id": 2,
  "username": "WuLong",
  "role": "USER"
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 用户名为空 |
| `400` | 密码为空 |
| `400` | 用户名已存在 |

### 登录

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/auth/login` |
| 是否需要登录 | 否 |

请求示例：

```json
{
  "username": "admin",
  "password": "admin"
}
```

成功响应示例：

```json
{
  "id": 1,
  "username": "admin",
  "role": "ADMIN",
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 用户名或密码不正确 |

失败响应示例：

```json
{
  "message": "用户名或密码不正确"
}
```

登录成功后，前端后续访问需要登录的接口时，应携带：

```http
Authorization: Bearer <accessToken>
```

### 重置密码

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/auth/reset-password` |
| 是否需要登录 | 否，当前学习阶段暂时放行 |

请求示例：

```json
{
  "username": "WuLong",
  "newPassword": "new123"
}
```

成功响应示例：

```json
{
  "message": "密码修改成功"
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 用户名为空 |
| `400` | 新密码为空 |
| `404` | 用户不存在 |
| `500` | 密码修改失败 |

### 获取当前用户

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/auth/me` |
| 是否需要登录 | 是 |

请求示例：

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
{
  "id": 2,
  "username": "WuLong",
  "role": "USER"
}
```

说明：

- 用于前端刷新页面后，从后端确认当前 token 对应的用户。
- 如果 token 无效、缺少 token，或 token 中的用户不存在，返回 `401`。

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录、token 无效，或 token 对应用户不存在 |

### 获取知识库列表

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/knowledge-bases` |
| 是否需要登录 | 是 |

请求示例：

```http
GET /api/knowledge-bases
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
[
  {
    "id": 1,
    "name": "产品文档知识库",
    "description": "用于产品功能、版本说明和用户手册问答。",
    "status": "ACTIVE",
    "featured": false,
    "themeId": null,
    "createdBy": 1,
    "createdAt": "2026-05-08T10:00:00Z",
    "updatedAt": "2026-05-08T10:00:00Z"
  }
]
```

说明：

- 只返回当前登录用户创建的知识库。

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录或 token 无效 |

### 获取知识库详情

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/knowledge-bases/{id}` |
| 是否需要登录 | 是 |

请求示例：

```http
GET /api/knowledge-bases/1
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
{
  "id": 1,
  "name": "产品文档知识库",
  "description": "用于产品功能、版本说明和用户手册问答。",
  "status": "ACTIVE",
  "featured": false,
  "themeId": null,
  "createdBy": 1,
  "createdAt": "2026-05-08T10:00:00Z",
  "updatedAt": "2026-05-08T10:00:00Z"
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录或 token 无效 |
| `404` | 知识库不存在，或不属于当前登录用户 |

失败响应示例：

```json
{
  "message": "Knowledge base not found"
}
```

### 创建知识库

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/knowledge-bases` |
| 是否需要登录 | 是 |

请求示例：

```http
POST /api/knowledge-bases
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "我的知识库",
  "description": "用于保存项目资料",
  "featured": true,
  "themeId": "green"
}
```

后端自动设置：

- `status`: `ACTIVE`
- `createdBy`: 当前登录用户 ID
- `createdAt` / `updatedAt`: 数据库自动生成

字段说明：

- `featured`: 是否精选；如果前端不传，后端按 `false` 保存。
- `themeId`: 前端主题色标识；如果前端不传或传空字符串，后端保存为 `null`。

成功响应状态码：`201 Created`

成功响应示例：

```json
{
  "id": 4,
  "name": "我的知识库",
  "description": "用于保存项目资料",
  "status": "ACTIVE",
  "featured": true,
  "themeId": "green",
  "createdBy": 2,
  "createdAt": "2026-05-08T10:00:00Z",
  "updatedAt": "2026-05-08T10:00:00Z"
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | `name` 为空 |
| `401` | 未登录或 token 无效 |
| `500` | 创建失败，或创建后无法读取数据 |

### 修改知识库

| 项目 | 内容 |
|---|---|
| 请求方式 | `PATCH` |
| 请求路径 | `/api/knowledge-bases/{id}` |
| 是否需要登录 | 是 |

请求示例：

```http
PATCH /api/knowledge-bases/4
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "name": "新的知识库名称",
  "description": "新的介绍",
  "featured": false,
  "themeId": "blue"
}
```

字段说明：

- `featured`: 是否精选；如果前端不传，后端按 `false` 更新。
- `themeId`: 前端主题色标识；如果前端不传或传空字符串，后端更新为 `null`。

成功响应示例：

```json
{
  "id": 4,
  "name": "新的知识库名称",
  "description": "新的介绍",
  "status": "ACTIVE",
  "featured": false,
  "themeId": "blue",
  "createdBy": 2,
  "createdAt": "2026-05-08T10:00:00Z",
  "updatedAt": "2026-05-08T10:05:00Z"
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | `name` 为空 |
| `401` | 未登录或 token 无效 |
| `404` | 知识库不存在，或不属于当前登录用户 |

### 删除知识库

| 项目 | 内容 |
|---|---|
| 请求方式 | `DELETE` |
| 请求路径 | `/api/knowledge-bases/{id}` |
| 是否需要登录 | 是 |

请求示例：

```http
DELETE /api/knowledge-bases/4
Authorization: Bearer <accessToken>
```

成功响应：

- 状态码：`204 No Content`
- 响应体：无

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录或 token 无效 |
| `404` | 知识库不存在，或不属于当前登录用户 |

说明：

- 数据库里 `documents.knowledge_base_id` 已设置 `ON DELETE CASCADE`。后续知识库下有文档后，删除知识库会级联删除对应文档，前端需要提供明确确认提示。

### Document 第一阶段接口契约

> 状态：文档上传、文档解析、文档切片和文档索引状态后端已进入阶段 4 完成范围。阶段 5 继续在 `document_chunks` 基础上增加关键词检索能力。

文档状态：

| 状态 | 含义 |
|---|---|
| `UPLOADED` | 文件记录已创建 |
| `PROCESSING` | 正在解析和切片 |
| `INDEXED` | 已完成文本切片，chunk 已入库 |
| `FAILED` | 解析或切片失败，失败原因写入 `errorMessage` |

#### 上传文档

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/knowledge-bases/{knowledgeBaseId}/documents` |
| 是否需要登录 | 是 |
| 请求体格式 | `multipart/form-data` |

表单字段：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `file` | file | 是 | 第一阶段只支持 `.txt`、`.md`、`.markdown`、`.pdf` |

规则：

- `knowledgeBaseId` 必须属于当前登录用户，否则返回 `404`。
- 单文件大小上限为 `10MB`。
- 文件类型不支持时返回 `400`。
- PDF 第一阶段只支持可提取文本的 PDF；扫描图片型 PDF 暂不做 OCR，如果无法提取文本会返回 `400` 并标记为 `FAILED`。
- 空白文本返回 `400`，文档记录保留为 `FAILED`，不保存 chunk。
- 上传成功后，后端读取文本内容并按固定长度切片，最终 `status` 为 `INDEXED`。
- 如果读取或切片过程中失败，文档记录保留，`status` 更新为 `FAILED`，`errorMessage` 保存失败原因。

成功响应示例：

```json
{
  "id": 1,
  "knowledgeBaseId": 1,
  "originalFilename": "note.md",
  "contentType": "text/markdown",
  "sizeBytes": 1280,
  "status": "INDEXED",
  "errorMessage": null,
  "createdBy": 1,
  "createdAt": "2026-05-12T10:00:00Z",
  "updatedAt": "2026-05-12T10:00:01Z",
  "chunkCount": 2
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 未上传文件、缺少 `file` 表单字段、文件为空、文件超过 10MB、扩展名不支持、文本内容为空白，或 PDF 无法提取文本 |
| `401` | 未登录或 token 无效 |
| `404` | 知识库不存在，或不属于当前登录用户 |
| `500` | 文件读取、解析或切片过程失败 |

#### 获取知识库下的文档列表

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/knowledge-bases/{knowledgeBaseId}/documents` |
| 是否需要登录 | 是 |

说明：

- 只返回当前登录用户自己的知识库文档。
- 返回文档基础信息和 `chunkCount`，不返回 chunk 内容。

#### 获取文档详情

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/documents/{documentId}` |
| 是否需要登录 | 是 |

说明：

- 只能查看当前登录用户自己的文档。
- 返回文档基础信息和 `chunkCount`。

#### 获取文档切片列表

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/documents/{documentId}/chunks` |
| 是否需要登录 | 是 |

成功响应示例：

```json
[
  {
    "chunkIndex": 0,
    "content": "第一段切片内容...",
    "charCount": 1000,
    "createdAt": "2026-05-12T10:00:01Z"
  }
]
```

#### 删除文档

| 项目 | 内容 |
|---|---|
| 请求方式 | `DELETE` |
| 请求路径 | `/api/documents/{documentId}` |
| 是否需要登录 | 是 |

成功响应：

- 状态码：`204 No Content`
- 响应体：无

说明：

- 只能删除当前登录用户自己的文档。
- 数据库里 `document_chunks.document_id` 需要设置 `ON DELETE CASCADE`，删除文档时自动删除对应 chunks。

#### 知识库内文档关键词检索

> 状态：阶段 5 已实现接口，当前进入前后端联调和真实文档检索验收。

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/knowledge-bases/{knowledgeBaseId}/search` |
| 是否需要登录 | 是 |
| 请求体格式 | `application/json` |

请求示例：

```json
{
  "query": "JWT 登录流程",
  "limit": 5
}
```

字段规则：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `query` | string | 是 | 关键词，`trim` 后不能为空 |
| `limit` | number | 否 | 默认 `5`；小于 `1` 返回 `400`；大于 `20` 时按 `20` 处理 |

成功响应示例：

```json
{
  "query": "JWT 登录流程",
  "results": [
    {
      "chunkId": 1,
      "documentId": 2,
      "documentName": "note.md",
      "chunkIndex": 0,
      "content": "...",
      "score": 1.0
    }
  ]
}
```

说明：

- 第一版是 PostgreSQL 普通关键词检索，不是语义检索。
- 第一版不接大模型、不引入 embedding、不引入 pgvector、不新增搜索引擎。
- 后端必须先用 `knowledgeBaseId + 当前 JWT userId` 校验知识库归属；知识库不存在或不属于当前用户时统一返回 `404`。
- SQL 检索时必须同时限制 `knowledge_base_id` 和 `created_by`，避免通过知识库 ID 或文档 ID 搜到其他用户的数据。
- 只检索 `status = 'INDEXED'` 的文档。
- `score` 第一版只表示关键词命中分数，例如命中返回 `1.0`，不代表语义相似度。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | `query` 为空，或 `limit < 1` |
| `401` | 未登录或 token 无效 |
| `404` | 知识库不存在，或不属于当前登录用户 |

### 前端知识库页面对接说明

后端知识库响应字段当前为：

```json
{
  "id": 4,
  "name": "我的知识库",
  "description": "用于保存项目资料",
  "status": "ACTIVE",
  "featured": true,
  "themeId": "green",
  "createdBy": 2,
  "createdAt": "2026-05-08T10:00:00Z",
  "updatedAt": "2026-05-08T10:00:00Z"
}
```

前端 `KnowledgeBases.tsx` 当前 UI 模型还需要 `slug`、`docs`、`chunks`、`sources`、`theme`、`createdByMe` 等字段。第一阶段对接时由前端映射函数补默认值即可，例如：

- `slug = String(id)`
- `docs = 0`
- `chunks = 0`
- `sources = []`
- `featured` 使用后端返回值
- `theme` 根据后端 `themeId` 映射；`themeId` 为 `null` 时前端默认使用 `blue`
- `createdByMe = true`

详情页路由可以继续使用 `/KnowledgeBases/:knowledgeBaseId`，但 `knowledgeBaseId` 应按后端数字 `id` 处理，不再按旧 mock `slug` 查找。

### Health

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/health` |
| 是否需要登录 | 否 |

请求示例：

```http
GET /api/health
```

成功响应示例：

```json
{
  "status": "UP"
}
```

说明：

- 用于本地开发、联调和演示前快速确认后端服务已启动。
- 该接口已在 Spring Security 中放行，不需要携带 JWT。

## 规划中接口

规划中接口单独列出，必须明确标记为“尚未实现”。

### Auth

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `POST` | `/api/auth/logout` | 退出登录 | 规划中 |

### Chat / RAG

> 状态：阶段 6 RAG 问答 MVP 已完成。第一版做非流式 RAG 问答，支持会话、消息、引用来源、会话重命名、删除、置顶和取消置顶。流式接口暂不实现，保留为后续规划。

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `POST` | `/api/knowledge-bases/{knowledgeBaseId}/chat/sessions` | 创建会话 | 阶段 6 已实现 |
| `GET` | `/api/knowledge-bases/{knowledgeBaseId}/chat/sessions` | 获取会话列表 | 阶段 6 已实现，包含 `pinned` |
| `PATCH` | `/api/chat/sessions/{sessionId}` | 重命名、置顶或取消置顶会话 | 阶段 6 已实现 |
| `DELETE` | `/api/chat/sessions/{sessionId}` | 删除会话 | 阶段 6 已实现 |
| `GET` | `/api/chat/sessions/{sessionId}/messages` | 获取会话消息 | 阶段 6 已实现 |
| `POST` | `/api/chat/sessions/{sessionId}/messages` | 发送问题并获取回答 | 阶段 6 已实现 |
| `POST` | `/api/chat/sessions/{sessionId}/messages/stream` | 流式问答 | 后续规划 |

#### 创建会话

```http
POST /api/knowledge-bases/{knowledgeBaseId}/chat/sessions
Authorization: Bearer <accessToken>
Content-Type: application/json
```

请求示例：

```json
{
  "title": "登录流程问答"
}
```

成功响应示例：

```json
{
  "id": 1,
  "knowledgeBaseId": 2,
  "title": "登录流程问答",
  "pinned": false,
  "createdAt": "2026-05-16T10:00:00Z",
  "updatedAt": "2026-05-16T10:00:00Z"
}
```

规则：

- `knowledgeBaseId` 必须属于当前登录用户。
- `title` 为空时后端可以使用默认标题，例如“新会话”。

#### 获取知识库会话列表

```http
GET /api/knowledge-bases/{knowledgeBaseId}/chat/sessions
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
[
  {
    "id": 1,
    "knowledgeBaseId": 2,
    "title": "登录流程问答",
    "pinned": true,
    "createdAt": "2026-05-16T10:00:00Z",
    "updatedAt": "2026-05-16T10:05:00Z"
  }
]
```

排序规则：

```text
pinned desc -> updatedAt desc -> id desc
```

#### 修改会话

```http
PATCH /api/chat/sessions/{sessionId}
Authorization: Bearer <accessToken>
Content-Type: application/json
```

请求示例：

```json
{
  "title": "新的会话标题",
  "pinned": true
}
```

字段规则：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 否 | 传入时 trim 后不能为空，建议长度不超过 200 |
| `pinned` | boolean | 否 | `true` 表示置顶，`false` 表示取消置顶 |

成功响应示例：

```json
{
  "id": 1,
  "knowledgeBaseId": 2,
  "title": "新的会话标题",
  "pinned": true,
  "createdAt": "2026-05-16T10:00:00Z",
  "updatedAt": "2026-05-16T10:08:00Z"
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 没有可更新字段，或 `title` 为空/过长 |
| `401` | 未登录或 token 无效 |
| `404` | 会话不存在，或不属于当前登录用户 |

#### 删除会话

```http
DELETE /api/chat/sessions/{sessionId}
Authorization: Bearer <accessToken>
```

成功响应：

- 状态码：`204 No Content`
- 响应体：无

规则：

- `sessionId` 必须属于当前登录用户。
- 删除会话后，对应 `chat_messages` 和 `chat_message_sources` 通过外键级联删除。

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录或 token 无效 |
| `404` | 会话不存在，或不属于当前登录用户 |

#### 获取会话消息

```http
GET /api/chat/sessions/{sessionId}/messages
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
[
  {
    "id": 10,
    "sessionId": 1,
    "role": "USER",
    "content": "JWT 登录流程是什么？",
    "sources": [],
    "createdAt": "2026-05-16T10:01:00Z"
  },
  {
    "id": 11,
    "sessionId": 1,
    "role": "ASSISTANT",
    "content": "根据当前知识库资料，JWT 登录流程是...",
    "sources": [
      {
        "documentId": 2,
        "documentName": "auth.md",
        "chunkId": 8,
        "chunkIndex": 0,
        "content": "登录成功后生成 JWT...",
        "score": 1.0
      }
    ],
    "createdAt": "2026-05-16T10:01:10Z"
  }
]
```

#### 发送问题并获取回答

```http
POST /api/chat/sessions/{sessionId}/messages
Authorization: Bearer <accessToken>
Content-Type: application/json
```

请求示例：

```json
{
  "content": "JWT 登录流程是什么？",
  "limit": 5
}
```

成功响应示例：

```json
{
  "message": {
    "id": 11,
    "sessionId": 1,
    "role": "ASSISTANT",
    "content": "根据当前知识库资料，JWT 登录流程是...",
    "sources": [
      {
        "documentId": 2,
        "documentName": "auth.md",
        "chunkId": 8,
        "chunkIndex": 0,
        "content": "登录成功后生成 JWT...",
        "score": 1.0
      }
    ],
    "createdAt": "2026-05-16T10:01:10Z"
  }
}
```

规则：

- `sessionId` 必须属于当前登录用户。
- 后端先基于会话所属知识库检索 chunks，再构造 prompt 调用模型。
- 第一版 `sources` 来自阶段 5 检索结果。
- `limit` 为空时默认 `5`，大于 `20` 时按 `20` 处理。
- 模型调用失败时返回明确错误，不返回或泄露密钥。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | `content` 为空，或 `limit < 1` |
| `401` | 未登录或 token 无效 |
| `404` | 会话不存在，或不属于当前登录用户 |
| `500` | 模型调用或消息保存失败 |
