# 架构说明

## 当前架构

当前项目采用前后端分离架构。

```text
Browser
  |
  | http://localhost:5173
  v
Vite Dev Server
  |
  | /api/** proxy
  v
Spring Boot Backend
  |
  | JDBC / JPA
  v
PostgreSQL
```

## 前端

前端使用 React + Vite。开发环境中，浏览器访问 Vite 服务，前端通过 `/api/**` 请求后端。

本地开发建议使用 Vite proxy 转发：

```text
/api/** -> http://localhost:8080/api/**
```

这样前端代码不需要直接写死 `http://localhost:8080`，也能减少本地 CORS 问题。

## 后端

后端当前是单体 Spring Boot 应用。

主要包结构：

```text
com.knowflow.backend
  auth
  config
  knowledgebase
  user
```

当前模块职责：

| 模块 | 职责 |
|---|---|
| `auth` | 注册、登录、请求和响应 DTO |
| `config` | Spring Security 等配置 |
| `knowledgebase` | 知识库实体、Repository、Controller |
| `user` | 用户实体和用户查询 |

## 数据库

数据库使用 PostgreSQL，通过 Docker Compose 启动。

当前 Flyway 初始化了这些表：

- `users`
- `knowledge_bases`
- `documents`
- `chat_sessions`
- `chat_messages`

当前真正使用中的表：

- `users`
- `knowledge_bases`

## 安全配置

当前 Spring Security 已接入，但 JWT 尚未实现。

当前学习阶段临时放行：

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/knowledge-bases`
- `GET /api/knowledge-bases/{id}`

其他请求默认需要认证。

## 未来演进

后续可以先在单体项目中按包拆分功能，等业务闭环稳定后，再考虑拆分服务。

推荐演进顺序：

1. 单体 Spring Boot 完成核心业务。
2. 抽出清晰的 auth、knowledge-base、document、rag、chat 模块。
3. 补齐 JWT 和统一错误响应。
4. 文档上传、解析、chunk、embedding、检索问答跑通。
5. 如果需要展示微服务能力，再拆为多个 Spring Boot 服务。
