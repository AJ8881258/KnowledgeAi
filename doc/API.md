# KnowFlow AI API 文档

## 基础信息

- Base URL: `http://localhost:8080`
- 请求体格式: `application/json`
- 当前认证状态: 登录和注册接口已实现；JWT 尚未实现。
- 当前放行接口:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `GET /api/knowledge-bases`
  - `GET /api/knowledge-bases/{id}`

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
  "role": "ADMIN"
}
```

失败情况：

| 状态码 | 原因 |
|---|---|
| `401` | 用户名或密码错误 |

### 获取知识库列表

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/knowledge-bases` |
| 是否需要登录 | 否，当前学习阶段暂时放行 |

请求示例：

```http
GET /api/knowledge-bases
```

成功响应示例：

```json
[
  {
    "id": 1,
    "name": "产品文档知识库",
    "description": "用于产品功能、版本说明和用户手册问答。",
    "status": "ACTIVE",
    "createdBy": 1,
    "createdAt": "2026-05-08T10:00:00Z",
    "updatedAt": "2026-05-08T10:00:00Z"
  }
]
```

### 获取知识库详情

| 项目 | 内容 |
|---|---|
| 请求方式 | `GET` |
| 请求路径 | `/api/knowledge-bases/{id}` |
| 是否需要登录 | 否，当前学习阶段暂时放行 |

请求示例：

```http
GET /api/knowledge-bases/1
```

成功响应示例：

```json
{
  "id": 1,
  "name": "产品文档知识库",
  "description": "用于产品功能、版本说明和用户手册问答。",
  "status": "ACTIVE",
  "createdBy": 1,
  "createdAt": "2026-05-08T10:00:00Z",
  "updatedAt": "2026-05-08T10:00:00Z"
}
```

当前限制：

- 如果知识库不存在，当前后端还没有统一 404 错误处理，后续应补全全局异常处理。

## 规划中接口

规划中接口单独列出，必须明确标记为“尚未实现”。

### Auth

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `GET` | `/api/auth/me` | 获取当前登录用户 | 规划中 |
| `POST` | `/api/auth/logout` | 退出登录 | 规划中 |

### Knowledge Base

统一使用当前已实现的路径风格 `/api/knowledge-bases`，不再沿用旧计划里的短路径写法。

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `POST` | `/api/knowledge-bases` | 创建知识库 | 规划中 |
| `PATCH` | `/api/knowledge-bases/{id}` | 修改知识库 | 规划中 |
| `DELETE` | `/api/knowledge-bases/{id}` | 删除知识库 | 规划中 |

### Document

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `POST` | `/api/knowledge-bases/{knowledgeBaseId}/documents` | 上传文档 | 规划中 |
| `GET` | `/api/knowledge-bases/{knowledgeBaseId}/documents` | 获取知识库文档列表 | 规划中 |
| `GET` | `/api/documents/{id}` | 获取文档详情 | 规划中 |
| `DELETE` | `/api/documents/{id}` | 删除文档 | 规划中 |
| `GET` | `/api/documents/{id}/chunks` | 查看文档切片 | 规划中 |

### Chat / RAG

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `POST` | `/api/knowledge-bases/{knowledgeBaseId}/chat/sessions` | 创建会话 | 规划中 |
| `GET` | `/api/knowledge-bases/{knowledgeBaseId}/chat/sessions` | 获取会话列表 | 规划中 |
| `GET` | `/api/chat/sessions/{sessionId}/messages` | 获取会话消息 | 规划中 |
| `POST` | `/api/chat/sessions/{sessionId}/messages` | 发送问题并获取回答 | 规划中 |
| `POST` | `/api/chat/sessions/{sessionId}/messages/stream` | 流式问答 | 规划中 |

### Health

| 请求方式 | 请求路径 | 用途 | 状态 |
|---|---|---|---|
| `GET` | `/api/health` | 后端健康检查 | 规划中 |
