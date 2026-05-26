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
- 阶段 11 不新增 PPT、Excel、OCR、异步队列或自动重试接口。
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

请求示例：

```http
GET /api/settings/model
Authorization: Bearer <accessToken>
```

成功响应示例：

```json
{
  "configured": true,
  "mode": "ENVIRONMENT",
  "model": "gpt-4.1-mini",
  "baseUrlConfigured": true,
  "apiKeyConfigured": true,
  "timeoutSeconds": 60,
  "editable": false
}
```

说明：

- 阶段 8 已实现，用于 `/Settings` 页面只读展示模型配置状态。
- 当前学习版模型配置由后端环境变量管理，`mode` 为 `ENVIRONMENT`。
- 不返回 API key 明文，也不返回 base URL 明文。
- `editable` 当前为 `false`，前端不提供模型配置保存入口。

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

规划中接口单独列出，必须明确标记为“尚未实现”。

### Auth

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `POST` | `/api/auth/logout` | 退出登录 | 规划中 |

### Settings

> 状态：阶段 8 只实现模型配置状态读取；用户级模型配置保存后续再做。

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `PATCH` | `/api/settings/model` | 保存用户级模型配置 | 后续规划 |

说明：

- 如果未来实现用户级模型配置，必须明确密钥保存方式、脱敏返回规则和作用域。
- API key 不能以明文返回前端。

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
        "score": 0.42
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
        "score": 0.42
      }
    ],
    "createdAt": "2026-05-16T10:01:10Z"
  }
}
```

规则：

- `sessionId` 必须属于当前登录用户。
- 后端先确认当前用户拥有该会话，并且仍是会话所属知识库成员，再基于该知识库检索 chunks，构造 prompt 调用模型。
- 当前 `sources` 来自阶段 9 PostgreSQL 全文检索结果，`score` 表示全文检索相关度分数。
- `limit` 为空时默认 `5`，大于 `20` 时按 `20` 处理。
- 模型调用失败时返回明确错误，不返回或泄露密钥。
- 阶段 10 已增强多轮上下文、空检索降级提示和引用来源展示；默认使用当前会话最近 6 条以内历史消息进入 prompt，并限制总长度。
- 阶段 10 空检索默认不调用模型，返回助手降级消息，`sources` 为空数组，不伪造引用来源。
- 阶段 10 模型调用失败继续返回脱敏错误，不泄露 API key、base URL、model 或供应商敏感错误。
- 如新增流式接口，必须先补充 SSE 契约。

失败情况：

| 状态码 | 原因 |
|---|---|
| `400` | `content` 为空，或 `limit < 1` |
| `401` | 未登录或 token 无效 |
| `404` | 会话不存在，或不属于当前登录用户 |
| `500` | 模型调用或消息保存失败 |
