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
  | JDBC / MyBatis
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

前端认证相关结构：

- `src/api/auth.ts`：登录、注册、重置密码接口封装。
- `src/api/http.ts`：axios 实例和 token 请求拦截器。
- `src/store/auth.ts`：Zustand 登录态存储。
- `src/lib/mock-auth.ts`：历史 mock auth 兼容层，后续应逐步改名或移除 mock 命名。
- `src/components/slider-layout.tsx`：主应用页面登录守卫。

## 后端

后端当前是单体 Spring Boot 应用。

主要包结构：

```text
com.knowflow.backend
  auth
  config
  document
  knowledgebase
  user
```

当前模块职责：

| 模块            | 职责                                    |
| --------------- | --------------------------------------- |
| `auth`          | 注册、登录、JWT 生成、请求和响应 DTO    |
| `common`        | 统一错误响应                            |
| `config`        | Spring Security、JWT 等配置             |
| `document`      | 文档上传、文本解析、切片、文档状态接口  |
| `knowledgebase` | 知识库 POJO、MyBatis Mapper、Controller |
| `user`          | 用户 POJO 和 MyBatis Mapper             |

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
- `knowledge_bases`，包含基础字段以及 `featured` 精选标记、`theme_id` 主题色标识。

文档上传第一阶段将启用和升级：

- `documents`：记录上传文件元信息、处理状态、失败原因和创建用户。
- `document_chunks`：保存文档切片文本。`document_id` 级联到 `documents.id`，删除文档时自动删除切片。

## 安全配置

当前 Spring Security 已接入，登录成功后会返回 JWT `accessToken`。

当前放行接口：

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/reset-password`

其他请求默认需要认证。当前 `/api/knowledge-bases/**` 已接入 JWT 认证，并按 JWT 中的 `userId` 过滤数据。文档接口也必须沿用同一规则：从 `@AuthenticationPrincipal Jwt jwt` 读取 `userId`，再通过 `knowledge_bases.created_by` 或 `documents.created_by` 确认资源属于当前用户。

## 未来演进

后续可以先在单体项目中按包拆分功能，等业务闭环稳定后，再考虑拆分服务。

推荐演进顺序：

1. 单体 Spring Boot 完成核心业务。
2. 抽出清晰的 auth、knowledge-base、document、rag、chat 模块。
3. 补齐 `GET /api/auth/me` 和更完整的登录态管理。
4. 文档上传、解析和 chunk 入库跑通。
5. embedding、向量检索和 RAG 问答跑通。
6. 如果需要展示微服务能力，再拆为多个 Spring Boot 服务。
