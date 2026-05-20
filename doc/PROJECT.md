# 项目概览

## 项目定位

KnowFlow AI 是一个智能知识库问答平台。目标是让用户上传学习资料、项目文档或产品文档后，可以基于自己的资料进行问答。

当前阶段 7：前端体验完善已完成代码级验收，下一阶段是阶段 8：项目交付整理。项目已经具备文档上传、切片、关键词检索、RAG 问答、引用来源、会话保存、会话管理、前端体验整理和后端稳定性测试能力。浏览器/UI 体验按项目规则由用户人工验收。

- 前端页面能调用真实后端接口。
- 后端能连接 PostgreSQL。
- 数据库结构由 Flyway 管理。
- 用户可以注册、登录。
- 前端可以读取后端知识库和文档数据。

阶段 6 第一版复用阶段 5 的 PostgreSQL 关键词检索结果构造 prompt，已完成非流式问答、引用来源、会话和消息保存，并补齐会话重命名、删除、置顶/取消置顶。`/Chat/{sessionId}` 切换会话时只刷新消息区域，`/KnowledgeBases/{id}` 只保留文档检索测试区。embedding、pgvector、流式输出和多模型选择仍放在后续扩展。

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
- RAG/Chat 接口：创建会话、会话列表、修改会话、删除会话、消息列表、发送问题并保存引用来源。
- 注册接口。
- 登录接口，成功后返回 JWT `accessToken`。
- 当前用户接口：`GET /api/auth/me`。
- 健康检查接口：`GET /api/health`。
- Spring Security 基础配置。
- 阶段 7 稳定性测试覆盖 401、400、404、缺少上传文件字段、级联删除和模型错误脱敏。

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
- Chat 页面已接入阶段 6 RAG 问答接口，支持会话列表、消息展示、发送问题、引用来源、会话重命名、删除、置顶和取消置顶。
- `/KnowledgeBases/{id}` 当前只保留文档检索测试区，不再承载 RAG 对话入口。
- Dashboard 已改为从真实知识库、文档和会话接口汇总当前账号状态，不再使用旧静态 mock 统计。
- KnowledgeBases 和 Chat 会通过现有文档列表接口补齐文档数、chunk 数和可检索来源数。
- Settings 已移除假模型测试、假 API Key、假导出和假删除账号入口，只保留当前后端能力能支撑的设置说明和退出登录。

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
- `chat`：会话、消息、引用来源接口。
- `rag`：检索结果转 Prompt、模型调用适配。
- `user`：用户数据访问。

数据库由 Flyway 管理。当前已使用或即将使用：

- `users`
- `knowledge_bases`
- `documents`
- `document_chunks`
- `chat_sessions`：支持 `pinned` 字段，用于会话置顶排序。
- `chat_messages`
- `chat_message_sources`：阶段 6 建议新增，用于保存回答引用来源。

当前 RAG 问答链路：

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

1. 阶段 7 已完成代码级验收，浏览器/UI 体验由用户人工验收。
2. 当前代码级验收结果：`pnpm build` 通过，后端 Maven 测试通过，阶段 7 前端目标文件 ESLint 通过。
3. 全量 `pnpm lint` 仍有 5 个基础组件/Hook 的既有 lint 规则错误，未在阶段 7 处理。
4. 下一阶段是阶段 8：项目交付整理。
5. 阶段 8 不做新的 RAG 核心能力，重点整理 README、演示账号、架构说明、启动复现和答辩材料。

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
