# 项目概览

## 项目定位

KnowFlow AI 是一个智能知识库问答平台。目标是让用户上传学习资料、项目文档或产品文档后，可以基于自己的资料进行问答。

当前阶段是阶段 6：RAG 问答 MVP。项目已经完成基础全栈闭环，并可以在已入库的文档 chunks 上提供知识库内关键词检索能力；阶段 6 基础问答链路已经进入前后端联调，当前收尾重点是 Chat 切换体验和会话管理。

- 前端页面能调用真实后端接口。
- 后端能连接 PostgreSQL。
- 数据库结构由 Flyway 管理。
- 用户可以注册、登录。
- 前端可以读取后端知识库和文档数据。

阶段 6 第一版复用阶段 5 的 PostgreSQL 关键词检索结果构造 prompt，先完成非流式问答、引用来源、会话和消息保存。当前补齐会话重命名、删除、置顶/取消置顶，并让 `/Chat/{sessionId}` 切换只刷新消息区域。embedding、pgvector、流式输出和多模型选择仍放在后续扩展。

## 当前技术栈

前端：

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- axios
- Zustand
- shadcn/radix-sera UI
- Lucide icons

后端：

- Java 21
- Spring Boot
- Spring Web MVC
- Spring Security
- MyBatis
- PostgreSQL
- Flyway
- Maven
- Docker Compose

## 当前已完成

后端已经完成：

- Spring Boot 后端项目骨架。
- PostgreSQL Docker Compose 配置。
- Flyway 初始化表结构。
- `users` 表。
- `knowledge_bases` 表。
- `documents` 表已在初始迁移中存在，但字段仍是早期占位设计；文档上传阶段需要通过新的 Flyway 迁移升级字段。
- 知识库列表、详情、创建、修改、删除接口。
- 知识库接口按 JWT 当前用户隔离数据。
- 知识库支持 `featured` 精选标记和 `themeId` 主题色字段。
- 文档上传、文档解析、文档切片和 `INDEXED` / `FAILED` 状态流转。
- 文档列表、详情、删除和 chunk 查询接口。
- 知识库内文档关键词检索接口：`POST /api/knowledge-bases/{knowledgeBaseId}/search`。
- 注册接口。
- 登录接口，成功后返回 JWT `accessToken`。
- Spring Security 基础配置。

前端已经开始接入真实后端：

- axios 请求封装。
- 登录页接入真实后端登录接口。
- 注册入口接入真实后端注册接口。
- 找回密码入口接入当前学习版重置密码接口。
- 登录成功后保存用户信息、`tokenType` 和 `accessToken`。
- “记住我”使用本地持久化；未勾选时使用会话级持久化。
- 已登录用户访问 `/login` 会自动跳转回目标页面。
- 未登录用户访问主应用页面会跳转 `/login`。
- Vite 代理用于本地转发 `/api/**` 请求。
- 知识库详情页已接入阶段 5 “检索测试区”，通过 axios 共享客户端调用 `POST /api/knowledge-bases/{knowledgeBaseId}/search`，展示命中文档名、chunk 序号、分数和片段内容。
- Documents、KnowledgeBases、Chat、Login、Settings、Dashboard 页面的大文件已拆分，页面组件迁移到 `src/components/*`。
- 文档相关 UI 位于 `src/components/documents/*`，知识库相关 UI 位于 `src/components/knowledge-bases/*`。

## 当前架构选择

当前不是微服务。后端先按单体 Spring Boot 项目推进，这样更适合学习和快速完成闭环。

当前开发架构：

```text
Browser -> Vite Dev Server -> Spring Boot Backend -> PostgreSQL
```

前端通过 Vite proxy 转发 `/api/**` 到 `http://localhost:8080/api/**`，避免业务代码写死后端地址。

后端主要模块：

- `auth`：注册、登录、JWT。
- `config`：Spring Security、JWT 配置。
- `knowledgebase`：知识库 CRUD。
- `document`：文档上传、解析、切片、关键词检索。
- `chat`：阶段 6 会话、消息、引用来源接口。
- `rag`：阶段 6 检索结果转 Prompt、模型调用适配。
- `user`：用户数据访问。

数据库由 Flyway 管理。当前已使用或即将使用：

- `users`
- `knowledge_bases`
- `documents`
- `document_chunks`
- `chat_sessions`：阶段 6 需要支持 `pinned` 字段，用于会话置顶排序。
- `chat_messages`
- `chat_message_sources`：阶段 6 建议新增，用于保存回答引用来源。

阶段 6 RAG 问答链路：

```text
Frontend Chat UI
  -> Chat Controller
  -> 校验当前用户、会话、知识库归属
  -> Document Chunk Search
  -> Prompt Builder
  -> OpenAI-compatible Model Client
  -> Chat Message Storage
```

未来可以按业务能力拆分为：

- auth：用户、登录、注册、JWT。
- knowledge-base：知识库 CRUD。
- document：文档上传、解析、切片。
- rag：embedding、向量检索、Prompt 构造。
- chat：会话和消息历史。

## 当前重点

当前优先级：

1. 阶段 6 已开始，后端和前端分别按 `doc/BACKEND_TASK.md`、`doc/FRONTEND_TASK.md` 执行。
2. 后端当前优先修复会话消息查询 SQL，补齐会话重命名、删除、置顶/取消置顶接口。
3. 前端当前优先修复 `/Chat/{sessionId}` 切换割裂感，只刷新消息区域；`/KnowledgeBases/{id}` 删除 RAG 对话入口，只保留检索测试区。
4. 阶段 6 不做 embedding、pgvector、流式输出、多模型选择和复杂 Agent 工作流。

## 本地开发命令

前端：

```powershell
pnpm dev
pnpm build
pnpm lint
```

后端：

```powershell
cd D:\Studio\MyWork\backend
docker compose up -d
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8080`

阶段 6 模型配置建议：

```properties
knowflow.ai.base-url=
knowflow.ai.api-key=
knowflow.ai.model=
knowflow.ai.timeout-seconds=60
```

密钥不要写入仓库。模型服务商未固定前，默认按 OpenAI-compatible Chat Completions 风格设计。

Flyway 规则：已经执行过的迁移文件不要修改；后续表结构变化新增 `V4__...sql`、`V5__...sql` 等迁移文件。
