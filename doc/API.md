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

## 阶段 12 权限模型

阶段 12 第一版从个人知识库扩展为“单个知识库共享协作”，不做团队空间、组织后台、邀请邮件或公开链接。

知识库成员角色：

| 角色 | 权限 |
|---|---|
| `OWNER` | 创建者默认角色；可编辑知识库、删除知识库、上传/删除文档、检索、Chat、管理成员 |
| `EDITOR` | 可查看和编辑知识库、上传/删除文档、检索、Chat；不可删除知识库、不可管理成员 |
| `VIEWER` | 可查看知识库、查看文档、检索、Chat；不可编辑、上传、删除或管理成员 |

通用错误语义：

| 状态码 | 含义 |
|---|---|
| `401` | 未登录、token 无效，或 token 中缺少当前用户信息 |
| `403` | 当前用户是成员，但当前角色无权执行该操作 |
| `404` | 资源不存在，或当前用户不是该知识库成员；用于避免暴露资源存在性 |

Chat 会话说明：

- 共享知识库只共享知识库、文档、检索和问答入口。
- Chat 会话仍归当前用户自己所有，不共享其他成员的会话历史。
- 成员可以基于共享知识库创建自己的会话。

## 已实现接口与阶段契约

说明：已实现接口按当前代码状态标记；进入当前阶段但尚未实现的接口会在对应小节用“阶段 X 待实现契约”明确标注，方便前后端按同一契约开发。

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
  "role": "USER",
  "email": "wulong@example.com"
}
```

说明：

- 用于前端刷新页面后，从后端确认当前 token 对应的用户。
- `email` 可以为 `null`，表示当前账号尚未设置邮箱。
- 如果 token 无效、缺少 token，或 token 中的用户不存在，返回 `401`。

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录、token 无效，或 token 对应用户不存在 |

### 修改当前用户资料

| 项目 | 内容 |
|---|---|
| 请求方式 | `PATCH` |
| 请求路径 | `/api/auth/me` |
| 是否需要登录 | 是 |

请求示例：

```http
PATCH /api/auth/me
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "email": "wulong@example.com"
}
```

成功响应示例：

```json
{
  "id": 2,
  "username": "WuLong",
  "role": "USER",
  "email": "wulong@example.com"
}
```

说明：

- 阶段 8 已实现，用于 `/Settings` 页面保存当前用户邮箱。
- 当前阶段邮箱只是资料字段，不包含邮箱验证码、邮件发送或换绑验证流程。
- 传入 `null` 或空字符串会清空邮箱。
- 邮箱会做基础格式校验和长度校验。
- 只能修改当前 JWT 用户自己的资料，不能传 userId 修改其他用户。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 请求体为空、邮箱格式错误、邮箱过长，或邮箱已被其他用户使用 |
| `401` | 未登录、token 无效，或 token 对应用户不存在 |

### 删除当前账号

| 项目 | 内容 |
|---|---|
| 请求方式 | `DELETE` |
| 请求路径 | `/api/auth/me` |
| 是否需要登录 | 是 |

请求示例：

```http
DELETE /api/auth/me
Authorization: Bearer <accessToken>
```

成功响应：

```http
204 No Content
```

说明：

- 阶段 8 已实现，用于 `/Settings` 危险区删除当前账号。
- 后端只根据当前 JWT 用户删除账号，不接收 userId 参数。
- 删除范围包括当前用户、知识库、文档、chunks、会话、消息和引用来源。
- 删除操作在事务内完成；前端必须做二次确认，但后端仍负责权限边界。

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录、token 无效，或 token 对应用户不存在 |
| `500` | 删除账号失败 |

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
    "updatedAt": "2026-05-08T10:00:00Z",
    "accessRole": "OWNER",
    "ownedByMe": true,
    "sharedWithMe": false
  }
]
```

说明：

- 阶段 12 后返回当前登录用户可访问的知识库，包括自己创建的和别人共享给自己的。
- `accessRole` 表示当前用户在该知识库中的角色：`OWNER`、`EDITOR`、`VIEWER`。
- `ownedByMe` 表示该知识库是否由当前用户创建。
- `sharedWithMe` 表示该知识库是否由其他用户共享给当前用户。

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
  "updatedAt": "2026-05-08T10:00:00Z",
  "accessRole": "OWNER",
  "ownedByMe": true,
  "sharedWithMe": false
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录或 token 无效 |
| `404` | 知识库不存在，或当前登录用户不是该知识库成员 |

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
  "updatedAt": "2026-05-08T10:00:00Z",
  "accessRole": "OWNER",
  "ownedByMe": true,
  "sharedWithMe": false
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
  "updatedAt": "2026-05-08T10:05:00Z",
  "accessRole": "OWNER",
  "ownedByMe": true,
  "sharedWithMe": false
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | `name` 为空 |
| `401` | 未登录或 token 无效 |
| `403` | 当前用户是 `VIEWER`，无权修改知识库 |
| `404` | 知识库不存在，或当前登录用户不是该知识库成员 |

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
| `403` | 当前用户不是 `OWNER`，无权删除知识库 |
| `404` | 知识库不存在，或当前登录用户不是该知识库成员 |

说明：

- 数据库里 `documents.knowledge_base_id` 已设置 `ON DELETE CASCADE`。后续知识库下有文档后，删除知识库会级联删除对应文档，前端需要提供明确确认提示。

### 获取知识库成员列表

> 状态：阶段 12 已实现。仅 `OWNER` 可调用。

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/knowledge-bases/{knowledgeBaseId}/members` |
| 是否需要登录 | 是 |

成功响应示例：

```json
[
  {
    "id": 1,
    "userId": 2,
    "username": "AKinEdit",
    "role": "EDITOR",
    "createdAt": "2026-05-25T10:00:00Z",
    "updatedAt": "2026-05-25T10:00:00Z"
  }
]
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录或 token 无效 |
| `403` | 当前用户不是 `OWNER` |
| `404` | 知识库不存在，或当前用户不是该知识库成员 |

### 添加知识库成员

> 状态：阶段 12 已实现。仅 `OWNER` 可调用。

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/knowledge-bases/{knowledgeBaseId}/members` |
| 是否需要登录 | 是 |

请求示例：

```json
{
  "username": "AKinEdit",
  "role": "EDITOR"
}
```

规则：

- `username` 必须是已注册用户的用户名。
- `role` 只能是 `EDITOR` 或 `VIEWER`；不能通过该接口添加 `OWNER`。
- 同一个用户不能重复添加到同一个知识库。
- 知识库创建者默认是 `OWNER`，不能重复添加为普通成员。

成功响应示例：

```json
{
  "id": 1,
  "userId": 2,
  "username": "AKinEdit",
  "role": "EDITOR",
  "createdAt": "2026-05-25T10:00:00Z",
  "updatedAt": "2026-05-25T10:00:00Z"
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 用户名为空、角色非法、用户不存在、重复添加成员，或尝试添加 `OWNER` |
| `401` | 未登录或 token 无效 |
| `403` | 当前用户不是 `OWNER` |
| `404` | 知识库不存在，或当前用户不是该知识库成员 |

### 修改知识库成员角色

> 状态：阶段 12 已实现。仅 `OWNER` 可调用。

| 项目 | 内容 |
|---|---|
| 请求方式 | `PATCH` |
| 请求路径 | `/api/knowledge-bases/{knowledgeBaseId}/members/{memberId}` |
| 是否需要登录 | 是 |

请求示例：

```json
{
  "role": "VIEWER"
}
```

规则：

- 只能把普通成员改为 `EDITOR` 或 `VIEWER`。
- 不允许把普通成员改成 `OWNER`。
- 不允许通过成员接口降级知识库 owner。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 角色非法，或尝试修改 owner |
| `401` | 未登录或 token 无效 |
| `403` | 当前用户不是 `OWNER` |
| `404` | 知识库或成员不存在，或当前用户不是该知识库成员 |

### 移除知识库成员

> 状态：阶段 12 已实现。仅 `OWNER` 可调用。

| 项目 | 内容 |
|---|---|
| 请求方式 | `DELETE` |
| 请求路径 | `/api/knowledge-bases/{knowledgeBaseId}/members/{memberId}` |
| 是否需要登录 | 是 |

成功响应：

```http
204 No Content
```

规则：

- 只能移除 `EDITOR` 或 `VIEWER`。
- 不允许移除 owner 自己的成员记录。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 尝试移除 owner |
| `401` | 未登录或 token 无效 |
| `403` | 当前用户不是 `OWNER` |
| `404` | 知识库或成员不存在，或当前用户不是该知识库成员 |

### Document 第一阶段接口契约

> 状态：文档上传、文档解析、文档切片和文档索引状态后端已进入阶段 4 完成范围。阶段 5 继续在 `document_chunks` 基础上增加关键词检索能力。

文档状态：

| 状态 | 含义 |
|---|---|
| `UPLOADED` | 文件记录已创建 |
| `PROCESSING` | 正在解析和切片 |
| `INDEXED` | 已完成文本切片，chunk 已入库 |
| `FAILED` | 解析或切片失败，失败原因写入 `errorMessage` |

阶段 15-16 已实现的文档质量、摘要和重试能力字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `chunkCount` | number | 当前文档已生成的 chunk 数。 |
| `charCount` | number | 当前文档可检索正文总字符数。 |
| `averageChunkLength` | number | 平均 chunk 字符数，用于判断切片是否过碎或过长。 |
| `minChunkLength` | number | 最短 chunk 字符数。 |
| `maxChunkLength` | number | 最长 chunk 字符数。 |
| `qualityWarnings` | string[] | 文档处理质量提示 code。当前可能值：`NO_CHUNKS`、`DOCUMENT_TOO_SHORT`、`CHUNK_TOO_SHORT`、`CHUNK_TOO_LONG`。前端负责映射为用户可读中文。 |
| `summary` | string \| null | 文档摘要能力生成的简短摘要；未生成或生成失败时为 `null`。 |
| `summaryUpdatedAt` | string \| null | 摘要最后生成或覆盖的时间。 |
| `sourceStored` | boolean | 后端是否保存了可用于重新处理的原始文件 bytes 或解析文本。仅返回布尔值，不返回原始内容。 |
| `reprocessAvailable` | boolean | 当前文档是否具备可重新处理来源。来源可以是原始 bytes、解析文本，或兼容旧数据的已有 chunks。 |

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
| `file` | file | 是 | 当前已支持 `.txt`、`.md`、`.markdown`、`.pdf`、`.docx`、`.html`、`.htm` |

规则：

- 阶段 12 后，`knowledgeBaseId` 必须是当前登录用户可访问的知识库，且当前用户角色必须是 `OWNER` 或 `EDITOR`；非成员返回 `404`，`VIEWER` 返回 `403`。
- 单文件大小上限为 `10MB`。
- 文件类型不支持时返回 `400`。
- PDF 当前只支持可提取文本的 PDF；扫描图片型 PDF 暂不做 OCR，如果无法提取文本会返回 `400` 并标记为 `FAILED`。
- 阶段 11 第一版已实现 `.docx` 文本提取，优先提取段落和表格文本；不支持旧版 `.doc`。
- 阶段 11 第一版已实现 `.html` / `.htm` 文本提取，后端会过滤脚本、样式等非正文内容。
- 阶段 11 不新增 PPT、Excel、OCR 或自动重试接口；阶段 17 新增 PostgreSQL 持久化处理任务，但不引入 MQ 或复杂任务中心。
- 阶段 16 开始，后端会保存原始上传 bytes；如果解析成功，还会保存规范化后的原始文本。`source_bytes` 和 `source_text` 仅用于后端重新处理，不通过 API 返回。
- 空白文本返回 `400`，文档记录保留为 `FAILED`，不保存 chunk。
- 阶段 17 开始，上传会创建 `UPLOAD_INDEX` 处理任务。默认同步模式下成功响应通常为 `INDEXED`；如果开启后台处理，响应可能先返回 `PROCESSING`，进度以处理任务查询接口为准。
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
  "chunkCount": 2,
  "sourceStored": true,
  "reprocessAvailable": true
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 未上传文件、缺少 `file` 表单字段、文件为空、文件超过 10MB、扩展名不支持、文本内容为空白，或 PDF/DOCX/HTML 无法提取有效文本 |
| `401` | 未登录或 token 无效 |
| `403` | 当前用户是 `VIEWER`，无权上传文档 |
| `404` | 知识库不存在，或当前登录用户不是该知识库成员 |
| `500` | 文件读取、解析或切片过程失败 |

#### 获取知识库下的文档列表

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/knowledge-bases/{knowledgeBaseId}/documents` |
| 是否需要登录 | 是 |

说明：

- 阶段 12 后，当前登录用户只要是该知识库成员即可查看文档列表。
- 返回文档基础信息和 `chunkCount`，不返回 chunk 内容。

#### 获取文档详情

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/documents/{documentId}` |
| 是否需要登录 | 是 |

说明：

- 阶段 12 后，当前登录用户只要是文档所属知识库成员即可查看文档详情。
- 返回文档基础信息、`chunkCount`、质量字段和摘要字段。
- 质量字段只描述当前已入库 chunks 的可检索文本质量，不改变检索排序。

#### 重新处理文档

> 状态：阶段 17 已升级为持久化处理任务。阶段 16 的真正失败重试来源优先级保持不变。

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/documents/{documentId}/reprocess` |
| 是否需要登录 | 是 |

说明：

- 当前用户必须是文档所属知识库成员。
- 只有 `OWNER` 或 `EDITOR` 可以重新处理文档；`VIEWER` 返回 `403`。
- 非成员访问返回 `404`，避免暴露文档存在性。
- 阶段 16 后，重新处理优先使用 `documents.source_bytes` 重新按原始文件类型解析；如果没有原始 bytes，则使用 `documents.source_text`；如果两者都不存在，则兼容阶段 15 旧数据，从当前已有 chunks 拼接出可重建文本。
- 如果文档既没有原始来源，也没有可重建 chunks，返回 `400`，文档状态保持或更新为 `FAILED`，`errorMessage` 为 `Document cannot be reprocessed because no source or indexed text is available`。
- 如果原始来源存在但文件类型仍不支持，例如旧版 `.doc`，返回对应脱敏 `400` 错误，文档保持 `FAILED`。
- 阶段 17 开始，重新处理会创建 `REPROCESS` 处理任务。默认同步模式下成功响应通常为 `INDEXED`；如果开启后台处理，响应可能先返回 `PROCESSING`，进度以处理任务查询接口为准。
- 重新处理成功时在事务内替换旧 chunks，文档状态更新为 `INDEXED`，后续检索和 Chat 引用使用新 chunks。
- 如果替换 chunks 过程失败，旧 chunks 会回滚保留，随后文档状态更新为 `FAILED`，`errorMessage` 写入脱敏后的失败原因，避免出现半替换数据。
- API 只返回 `sourceStored` 和 `reprocessAvailable`，不会返回 `source_bytes`、`source_text` 或原始正文内容。

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
  "updatedAt": "2026-05-30T10:00:00Z",
  "chunkCount": 3,
  "charCount": 2600,
  "averageChunkLength": 866,
  "minChunkLength": 320,
  "maxChunkLength": 1200,
  "qualityWarnings": [],
  "sourceStored": true,
  "reprocessAvailable": true
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 文档没有可用原始来源或可重建 chunks，或原始来源对应文件类型仍不支持 |
| `401` | 未登录或 token 无效 |
| `403` | 当前用户是 `VIEWER`，无权重新处理文档 |
| `404` | 文档不存在，或当前登录用户不是该文档所属知识库成员 |
| `500` | 重新切片或模型外部无关的后端处理失败，错误已脱敏 |

#### 文档处理任务响应字段

> 状态：阶段 17 已实现。

`DocumentProcessingJobResponse`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 处理任务 ID。 |
| `documentId` | number | 任务所属文档 ID。 |
| `knowledgeBaseId` | number | 任务所属知识库 ID。 |
| `requestedBy` | number | 发起上传或重新处理的用户 ID。 |
| `jobType` | string | 任务类型：`UPLOAD_INDEX` 或 `REPROCESS`。 |
| `status` | string | 任务状态：`QUEUED`、`RUNNING`、`SUCCEEDED`、`FAILED`、`CANCELED`。 |
| `progressPercent` | number | 粗粒度进度，范围 0-100。当前解析器没有可靠字节级进度，因此使用阶段里程碑。 |
| `stage` | string \| null | 阶段码，例如 `QUEUED`、`READ_SOURCE`、`EXTRACT_TEXT`、`SPLIT_CHUNKS`、`WRITE_CHUNKS`、`COMPLETED`、`FAILED`。 |
| `message` | string \| null | 脱敏用户可读任务消息。 |
| `errorMessage` | string \| null | 脱敏失败原因；成功或未失败时为 `null`。 |
| `startedAt` | string \| null | 任务进入运行状态的时间。 |
| `finishedAt` | string \| null | 任务成功、失败或取消的时间。 |
| `createdAt` | string | 任务创建时间。 |
| `updatedAt` | string | 任务最后更新时间。 |

说明：

- `documents.status` 表示文档当前可检索材料化状态；`document_processing_jobs.status` 表示某次上传或重新处理尝试的状态。
- 前端应优先用活跃任务显示“后台处理中”和进度，用文档状态显示最终可检索状态。
- 任务消息和错误不得包含服务器路径、堆栈、API Key、Authorization header 或模型供应商敏感错误。

#### 获取知识库处理任务列表

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/knowledge-bases/{knowledgeBaseId}/document-processing-jobs?limit=20` |
| 是否需要登录 | 是 |

说明：

- 当前用户必须是知识库成员；非成员返回 `404`。
- `limit` 可选，默认 20，最小 1，最大 50。
- 返回最近任务，活跃的 `QUEUED` / `RUNNING` 任务优先。

#### 获取文档处理任务列表

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/documents/{documentId}/processing-jobs?limit=10` |
| 是否需要登录 | 是 |

说明：

- 当前用户必须是文档所属知识库成员；非成员返回 `404`。
- `limit` 可选，默认 20，最小 1，最大 50。
- 返回该文档最近的上传或重新处理任务。

#### 获取单个处理任务

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/document-processing-jobs/{jobId}` |
| 是否需要登录 | 是 |

说明：

- 当前用户必须是任务所属知识库成员；非成员返回 `404`。
- 前端可对活跃任务按 job ID 轮询，任务进入 `SUCCEEDED`、`FAILED` 或 `CANCELED` 后停止轮询并刷新文档列表。

#### 获取文档质量报告

> 状态：阶段 15 已实现。

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/documents/{documentId}/quality` |
| 是否需要登录 | 是 |

说明：

- 当前用户只要是文档所属知识库成员即可查看。
- 该接口只返回文档处理质量信息，不返回完整 chunk 内容。
- 用于前端在文档详情页展示“是否适合 RAG”的判断依据。

成功响应示例：

```json
{
  "documentId": 1,
  "status": "INDEXED",
  "chunkCount": 3,
  "charCount": 2600,
  "averageChunkLength": 866,
  "minChunkLength": 320,
  "maxChunkLength": 1200,
  "qualityWarnings": [
    "CHUNK_TOO_SHORT"
  ],
  "updatedAt": "2026-05-30T10:00:00Z"
}
```

#### 生成文档摘要

> 状态：阶段 15 已实现。

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/documents/{documentId}/summary` |
| 是否需要登录 | 是 |
| 请求体格式 | `application/json` |

请求示例：

```json
{
  "maxLength": 500
}
```

说明：

- 当前用户只要是文档所属知识库成员即可生成或查看摘要。
- 摘要使用当前用户自己的模型配置；未配置时可使用后端环境变量兜底。
- `maxLength` 为空时默认 `500`；小于 `1` 返回 `400`；大于 `4000` 时按 `4000` 裁剪。后端会在 prompt 中提示模型控制长度，并在返回前再次截断。
- 模型调用失败时返回脱敏错误，不泄露 API Key、Authorization header、完整 Base URL、model 或供应商敏感错误。
- 摘要不得替代原始 chunks 作为引用来源；Chat 引用仍必须来自真实 chunk。
- 摘要保存到 `documents.summary` 和 `documents.summary_updated_at`，不会写入 `document_chunks` 或 `chat_message_sources`。

成功响应示例：

```json
{
  "documentId": 1,
  "summary": "这份文档主要介绍 JWT 登录流程、令牌结构和接口鉴权方式。",
  "updatedAt": "2026-05-30T10:00:00Z"
}
```

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

- 阶段 12 后，只有知识库 `OWNER` 或 `EDITOR` 可以删除文档；`VIEWER` 只能查看，不能删除。
- 数据库里 `document_chunks.document_id` 需要设置 `ON DELETE CASCADE`，删除文档时自动删除对应 chunks。

#### 知识库内文档检索

> 状态：阶段 9 已完成。该接口继续沿用原路径，后端检索实现已从普通关键词匹配升级为 PostgreSQL 全文检索。

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
      "score": 0.42
    }
  ]
}
```

说明：

- 阶段 9 已使用 PostgreSQL 全文检索，不是语义向量检索。
- 阶段 9 未接新大模型、未引入 embedding、未引入 pgvector、未新增搜索引擎。
- 阶段 12 后，后端必须先校验当前 JWT 用户是该知识库成员；非成员访问时统一返回 `404`。
- SQL 检索时必须限制 `knowledge_base_id`，并通过成员权限校验避免通过知识库 ID 或文档 ID 搜到无权访问的数据。
- 只检索 `status = 'INDEXED'` 的文档。
- `score` 表示 PostgreSQL 全文检索相关度分数，用于结果排序和 RAG 引用来源排序；它不是语义相似度，也不保证不同知识库之间可直接比较。
- `query`、`results`、`chunkId`、`documentId`、`documentName`、`chunkIndex`、`content`、`score` 字段保持兼容。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | `query` 为空，或 `limit < 1` |
| `401` | 未登录或 token 无效 |
| `404` | 知识库不存在，或当前登录用户不是该知识库成员 |

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
  "updatedAt": "2026-05-08T10:00:00Z",
  "accessRole": "OWNER",
  "ownedByMe": true,
  "sharedWithMe": false
}
```

前端 `KnowledgeBases.tsx` 当前 UI 模型还需要 `slug`、`docs`、`chunks`、`sources`、`theme`、`createdByMe` 等字段。第一阶段对接时由前端映射函数补默认值即可，例如：

- `slug = String(id)`
- `docs = 0`
- `chunks = 0`
- `sources = []`
- `featured` 使用后端返回值
- `theme` 根据后端 `themeId` 映射；`themeId` 为 `null` 时前端默认使用 `blue`
- `createdByMe` 后续应优先由 `ownedByMe` 映射；共享知识库使用 `sharedWithMe` 和 `accessRole` 展示角色与权限。

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

### 获取模型配置状态

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/settings/model` |
| 是否需要登录 | 是 |
| 状态 | 阶段 13 已实现 |

请求示例：

```http
GET /api/settings/model
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
{
  "configured": true,
  "model": "gpt-4.1-mini",
  "baseUrl": "https://api.openai.com/v1",
  "baseUrlConfigured": true,
  "apiKeyConfigured": true,
  "timeoutSeconds": 60,
  "updatedAt": "2026-05-26T10:00:00Z"
}
```

说明：

- 阶段 13 已将该接口升级为当前用户级模型配置状态读取。
- `baseUrl` 会返回当前用户保存的 OpenAI-compatible 服务地址，用于 Settings 刷新后回显和继续获取模型列表。
- 接口永远不返回 API Key 明文，也不返回 `encryptedApiKey`；`apiKeyConfigured` 只表示是否已保存 Key。
- `baseUrlConfigured` 表示是否已配置 Base URL。
- 阶段 13 后不再返回 `mode: "ENVIRONMENT"`、`editable` 等只读阶段字段；前端也不再展示“配置模式 / 后端环境变量”“保存入口 / 本阶段只读展示”等文案。
- 用户未保存模型配置时，后端可继续使用环境变量作为本地开发兜底，但 Settings 页面不展示为“后端环境变量模式”。

### 保存模型配置

| 项目 | 内容 |
|---|---|
| 请求方式 | `PATCH` |
| 请求路径 | `/api/settings/model` |
| 是否需要登录 | 是 |
| 状态 | 阶段 13 已实现 |

请求示例：

```http
PATCH /api/settings/model
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-4.1-mini",
  "timeoutSeconds": 60
}
```

成功响应示例：

```json
{
  "configured": true,
  "model": "gpt-4.1-mini",
  "baseUrl": "https://api.openai.com/v1",
  "baseUrlConfigured": true,
  "apiKeyConfigured": true,
  "timeoutSeconds": 60,
  "updatedAt": "2026-05-26T10:00:00Z"
}
```

规则：

- `baseUrl` 保存 OpenAI-compatible 根地址，例如 `https://api.openai.com/v1`；后端调用 Chat Completions 时会追加 `/chat/completions`。
- 如果用户误填完整接口地址，例如 `https://api.openai.com/v1/chat/completions`，后端会规范化保存为 `https://api.openai.com/v1`。
- 如果 Base URL 缺少 `/v1` 根路径、不是合法 URL，或带有 user-info，返回 `400`，不保存配置。
- `apiKey` 为空或未传时表示不覆盖已保存 Key。
- 阶段 13 收尾后不再提供单独清除 API Key 入口；用户需要更换 Key 时，重新填写新的 `apiKey` 覆盖旧 Key。
- API Key 必须由后端加密保存；加密密钥建议来自环境变量，例如 `KNOWFLOW_MODEL_SECRET_KEY` 或配置项 `knowflow.model.secret-key`。
- 如果用户传入 `apiKey` 但后端未配置加密密钥，必须拒绝保存并返回明确错误。
- 响应体与 `GET /api/settings/model` 一致，会返回 `baseUrl` 但不返回 API Key 明文或 `encryptedApiKey`。
- 保存失败、模型供应商错误或加密错误都必须脱敏，不泄露 API Key、Authorization header、完整供应商错误或内部密钥。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | Base URL、model 或 timeoutSeconds 不合法，Base URL 不是 OpenAI-compatible `/v1` 根地址，或配置不完整 |
| `401` | 未登录或 token 无效 |
| `500` | 加密密钥缺失、加密失败或保存失败；错误信息必须脱敏 |

### 获取模型列表

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/settings/model/models` |
| 是否需要登录 | 是 |
| 状态 | 阶段 13 已实现 |

请求示例：

使用本次输入的 Base URL 和 API Key：

```json
{
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-..."
}
```

也可以复用当前用户已保存的配置：

```json
{}
```

或者使用本次输入的 Base URL + 当前用户已保存的 API Key：

```json
{
  "baseUrl": "https://api.openai.com/v1"
}
```

成功响应示例：

```json
{
  "models": [
    {
      "id": "gpt-4.1-mini",
      "name": "gpt-4.1-mini"
    }
  ]
}
```

规则：

- 后端优先使用用户本次传入的 Base URL 和 API Key；请求体缺少 `baseUrl` 或 `apiKey` 时，复用当前用户已保存的 Base URL 或已保存并解密后的 API Key。
- 该接口只用于拉取可选模型列表，不把供应商模型固定写死到后端枚举。
- 该接口默认不保存 API Key；保存仍由 `PATCH /api/settings/model` 完成。
- 如果最终缺少 Base URL 或 API Key，返回 `400`。
- 失败时返回脱敏错误，不返回 API Key、完整 Authorization header 或供应商敏感错误。

### 测试模型连接

| 项目 | 内容 |
|---|---|
| 请求方式 | `POST` |
| 请求路径 | `/api/settings/model/test` |
| 是否需要登录 | 是 |
| 状态 | 阶段 14 已正式接入前端 |

说明：

- Settings 页面用该接口验证当前用户的 OpenAI-compatible 配置是否真实可用。
- 请求体允许传入本次表单里的 `baseUrl`、`apiKey`、`model`；字段为空时后端复用当前用户已保存的配置。
- 该接口会真实调用模型供应商，但不会保存 API Key；保存仍由 `PATCH /api/settings/model` 完成。
- 测试成功或失败都必须脱敏，不返回 API Key、完整 Authorization header、完整 Base URL、model 或供应商敏感原始错误。

请求示例：

```json
{
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "<new-api-key>",
  "model": "gpt-4.1-mini"
}
```

也可以复用已保存配置：

```json
{}
```

成功响应示例：

```json
{
  "success": true,
  "message": "模型连接测试成功"
}
```

### 获取偏好设置

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/settings/preferences` |
| 是否需要登录 | 是 |
| 状态 | 阶段 13 已实现 |

成功响应示例：

```json
{
  "language": "zh-CN",
  "timezone": "Asia/Shanghai"
}
```

说明：

- `language` 第一版只保存偏好，预留后续 i18n，不要求阶段 13 做全站多语言。
- `timezone` 用于前端时间显示和后端“今日交谈次数”的日界线。
- 如果用户未保存过偏好，后端可返回默认 `zh-CN` 和浏览器传入/服务端默认时区；前端默认可使用 `Intl.DateTimeFormat().resolvedOptions().timeZone`。

### 保存偏好设置

| 项目 | 内容 |
|---|---|
| 请求方式 | `PATCH` |
| 请求路径 | `/api/settings/preferences` |
| 是否需要登录 | 是 |
| 状态 | 阶段 13 已实现 |

请求示例：

```json
{
  "language": "zh-CN",
  "timezone": "Asia/Shanghai"
}
```

成功响应示例：

```json
{
  "language": "zh-CN",
  "timezone": "Asia/Shanghai"
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | language 或 timezone 不合法 |
| `401` | 未登录或 token 无效 |

### 获取 RAG 参数

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/settings/rag` |
| 是否需要登录 | 是 |

请求示例：

```http
GET /api/settings/rag
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
{
  "topK": 5,
  "maxContextChunks": 5,
  "temperature": 0.2
}
```

说明：

- 阶段 8 已实现，返回当前 JWT 用户的 RAG 参数。
- 如果用户从未保存过参数，后端返回默认值。
- 当前后端 Chat/RAG 流程会读取这些参数：
  - `topK` 控制检索阶段最多取多少个 chunk。
  - `maxContextChunks` 控制进入 prompt 和引用来源保存的 chunk 数量。
  - `temperature` 传给模型调用。

### 更新 RAG 参数

| 项目 | 内容 |
|---|---|
| 请求方式 | `PATCH` |
| 请求路径 | `/api/settings/rag` |
| 是否需要登录 | 是 |

请求示例：

```http
PATCH /api/settings/rag
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "topK": 5,
  "maxContextChunks": 5,
  "temperature": 0.2
}
```

成功响应示例：

```json
{
  "topK": 5,
  "maxContextChunks": 5,
  "temperature": 0.2
}
```

说明：

- 阶段 8 已实现，用于 `/Settings` 页面保存当前用户级 RAG 参数。
- 请求体可以只传部分字段，未传字段沿用当前值。
- `topK` 和 `maxContextChunks` 范围为 `1-20`。
- `temperature` 范围为 `0-2`。
- 保存后的参数会被后续 RAG 问答使用。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | 请求体为空、参数为空，或参数超出范围 |
| `401` | 未登录、token 无效，或 token 中缺少 userId |

## 规划中接口

规划中接口单独列出，必须明确标记为“尚未实现”。阶段 13 的当前开发契约已写入上方对应小节，避免前后端重复维护两套描述。

### Auth

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `POST` | `/api/auth/logout` | 退出登录 | 规划中 |

### Chat / RAG

> 状态：阶段 6 RAG 问答 MVP 已完成。阶段 13 将在不新增 SSE 的前提下，把 Chat 发送改造成异步生成，并为会话增加未读和生成状态。流式接口暂不实现，保留为后续规划。

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `POST` | `/api/knowledge-bases/{knowledgeBaseId}/chat/sessions` | 创建会话 | 阶段 6 已实现 |
| `GET` | `/api/knowledge-bases/{knowledgeBaseId}/chat/sessions` | 获取会话列表 | 阶段 6 已实现；阶段 13 增加 `unread`、`status` |
| `PATCH` | `/api/chat/sessions/{sessionId}` | 重命名、置顶、取消置顶、标记未读/已读 | 阶段 6 已实现；阶段 13 增加 `unread` |
| `DELETE` | `/api/chat/sessions/{sessionId}` | 删除会话 | 阶段 6 已实现 |
| `GET` | `/api/chat/sessions/{sessionId}/messages` | 获取会话消息 | 阶段 6 已实现 |
| `POST` | `/api/chat/sessions/{sessionId}/messages` | 发送问题并创建后台生成任务 | 阶段 13 已实现异步契约；阶段 14 收尾新增 `model`、`ragEnabled` |
| `POST` | `/api/chat/sessions/{sessionId}/cancel` | 打断当前会话后台生成 | 阶段 14 收尾新增 |
| `GET` | `/api/chat/usage/today?timezone=Asia/Shanghai` | 获取今日交谈次数 | 阶段 13 已实现 |
| `POST` | `/api/chat/sessions/{sessionId}/messages/stream` | 流式问答 | 后续规划，尚未实现 |

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
  "unread": false,
  "status": "IDLE",
  "createdAt": "2026-05-16T10:00:00Z",
  "updatedAt": "2026-05-16T10:00:00Z"
}
```

规则：

- 阶段 12 后，`knowledgeBaseId` 必须是当前用户可访问的知识库成员资源。
- 当前用户可基于共享知识库创建自己的会话。
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
    "unread": false,
    "status": "IDLE",
    "createdAt": "2026-05-16T10:00:00Z",
    "updatedAt": "2026-05-16T10:05:00Z"
  }
]
```

排序规则：

```text
pinned desc -> updatedAt desc -> id desc
```

阶段 12 说明：

- 会话列表只返回当前用户自己的会话。
- 共享知识库不会暴露其他成员的会话历史。

阶段 13 说明：

- `unread` 表示当前用户是否有未读会话提醒；已读会话不需要额外展示“已读”文案。
- `status` 建议使用 `IDLE`、`GENERATING`、`FAILED`。`GENERATING` 表示后台正在生成回答，`FAILED` 表示上一次后台生成失败。
- 前端可以轮询会话列表和当前会话消息列表，用于发现非当前会话生成完成后的未读状态。

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
  "pinned": true,
  "unread": false
}
```

字段规则：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 否 | 传入时 trim 后不能为空，建议长度不超过 200 |
| `pinned` | boolean | 否 | `true` 表示置顶，`false` 表示取消置顶 |
| `unread` | boolean | 否 | 阶段 13 新增；`true` 表示手动设为未读，`false` 表示标记已读 |

成功响应示例：

```json
{
  "id": 1,
  "knowledgeBaseId": 2,
  "title": "新的会话标题",
  "pinned": true,
  "unread": false,
  "status": "IDLE",
  "lastErrorMessage": null,
  "createdAt": "2026-05-16T10:00:00Z",
  "updatedAt": "2026-05-16T10:08:00Z"
}
```

阶段 13 说明：

- 前端点击进入未读会话后，调用该接口传 `unread: false` 标记已读。
- 会话菜单新增“设为未读”时，调用该接口传 `unread: true`。
- 已读状态不需要额外文案，只有未读会话展示“未读”标记。
- `lastErrorMessage` 是后台生成失败时返回给前端的脱敏错误字段；它不会包含 API Key、Authorization header、完整 Base URL、model 或供应商原始错误。

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
        "score": 0.42
      }
    ],
    "createdAt": "2026-05-16T10:01:10Z"
  }
]
```

#### 发送问题并创建后台生成任务

```http
POST /api/chat/sessions/{sessionId}/messages
Authorization: Bearer <accessToken>
Content-Type: application/json
```

请求示例：

```json
{
  "content": "JWT 登录流程是什么？",
  "limit": 5,
  "model": "gpt-4.1-mini",
  "ragEnabled": true
}
```

成功响应示例：

```json
{
  "userMessage": {
    "id": 10,
    "sessionId": 1,
    "role": "USER",
    "content": "JWT 登录流程是什么？",
    "sources": [],
    "createdAt": "2026-05-16T10:01:00Z"
  },
  "session": {
    "id": 1,
    "knowledgeBaseId": 2,
    "title": "登录流程问答",
    "pinned": false,
    "unread": false,
    "status": "GENERATING",
    "createdAt": "2026-05-16T10:00:00Z",
    "updatedAt": "2026-05-16T10:01:00Z"
  }
}
```

规则：

- `sessionId` 必须属于当前登录用户。
- 阶段 13 该接口只同步保存用户消息并把会话状态置为 `GENERATING`，随后由后端后台任务完成检索、Prompt 构造、模型调用、助手消息和引用来源保存。
- 阶段 14 请求体新增可选 `model`。传入时后端会把它作为本次生成模型；如果当前用户已经有完整 Settings 模型配置，则同步保存为当前模型；如果用户只依赖 `.env`/环境变量兜底配置，则不强制创建用户 Settings 记录。
- 阶段 14 收尾新增可选 `ragEnabled`。未传时默认 `true`；`true` 表示检索知识库片段并保存真实引用来源，`false` 表示跳过知识库检索，只按当前会话上下文和模型生成回答，响应消息的 `sources` 为空数组且不伪造引用来源。
- 前端通过轮询 `GET /api/chat/sessions/{sessionId}/messages` 和会话列表获取生成结果。
- 后端先确认当前用户拥有该会话，并且仍是会话所属知识库成员；当 `ragEnabled !== false` 时，再基于该知识库检索 chunks，构造 prompt 调用模型。
- 当前 `sources` 来自阶段 9 PostgreSQL 全文检索结果，`score` 表示全文检索相关度分数。
- `limit` 为空时默认 `5`，大于 `20` 时按 `20` 处理。
- `model` 为空时使用当前用户 Settings 中保存的模型；如果用户没有完整模型配置，则允许按本地开发兜底配置处理。
- 本地开发兜底配置可以来自后端环境变量或项目根目录/backend 目录的 `.env`，包括 `KNOWFLOW_AI_BASE_URL`、`KNOWFLOW_AI_API_KEY`、`KNOWFLOW_AI_MODEL`。
- 模型调用失败时返回明确错误，不返回或泄露密钥。
- 阶段 10 已增强多轮上下文和引用来源展示；默认使用当前会话最近 6 条以内历史消息进入 prompt，并限制总长度。
- 阶段 13 收尾修复后，空检索不再跳过模型：后端仍使用当前用户自己的模型配置生成回答，但 `sources` 必须为空数组，且 prompt 会要求模型说明“当前没有可引用的知识库片段”，不能伪造引用来源。
- 阶段 13 Chat 模型调用优先使用当前用户保存的模型配置；未保存时允许回退后端环境变量作为本地开发兜底。
- 模型 Base URL 必须是 OpenAI-compatible 根地址，例如 `https://api.openai.com/v1`；历史或误填的完整 `/chat/completions` 地址会被规范化到 `/v1` 后再调用。
- 阶段 13 允许多个会话同时处于 `GENERATING`。后台生成成功后后端把该会话 `unread` 标记为 `true`，前端进入会话后会标记已读。
- 阶段 14 明确成功/失败状态与已读/未读状态分离：后台生成成功或失败都会把会话标记为 `unread: true`，但 Header 角标只按 `unread` 统计，前端通过 `status` 区分 `IDLE` 或 `FAILED`。
- 阶段 13/14 模型调用失败继续返回脱敏错误，不泄露 API key、完整 Base URL、model 或供应商敏感错误，并通过会话列表的 `lastErrorMessage` 返回脱敏失败原因。
- 如新增流式接口，必须先补充 SSE 契约。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | `content` 为空，或 `limit < 1` |
| `401` | 未登录或 token 无效 |
| `404` | 会话不存在，或不属于当前登录用户 |
| `500` | 模型调用或消息保存失败 |

#### 打断当前会话后台生成

```http
POST /api/chat/sessions/{sessionId}/cancel
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
{
  "id": 1,
  "knowledgeBaseId": 2,
  "title": "登录流程问答",
  "pinned": false,
  "unread": false,
  "status": "IDLE",
  "lastErrorMessage": null,
  "createdAt": "2026-05-16T10:00:00Z",
  "updatedAt": "2026-05-16T10:02:00Z"
}
```

规则：

- `sessionId` 必须属于当前登录用户。
- 当前用户仍必须是会话所属知识库成员。
- 如果会话处于 `GENERATING`，后端把会话恢复为 `IDLE`，清空当前活跃生成标识，保留已经保存的用户消息。
- 打断不强行杀掉已经发给模型供应商的 HTTP 请求；后端通过生成标识保证被打断后的晚到结果不会再写入助手消息、sources 或覆盖会话状态。
- 如果会话已经不是 `GENERATING`，该接口按幂等打断处理，返回当前最新会话状态。

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 未登录或 token 无效 |
| `404` | 会话不存在，或不属于当前登录用户 |

#### 获取今日交谈次数

```http
GET /api/chat/usage/today?timezone=Asia/Shanghai
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
{
  "date": "2026-05-26",
  "timezone": "Asia/Shanghai",
  "messageCount": 12
}
```

规则：

- 统计当前 JWT 用户在指定时区当天发送的 `USER` 消息数量。
- `timezone` 为空时，后端可以使用当前用户偏好时区；如果偏好也不存在，则使用默认时区。
- 该接口用于侧边栏底部显示“今日交谈 N 次”。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | timezone 不合法 |
| `401` | 未登录或 token 无效 |
