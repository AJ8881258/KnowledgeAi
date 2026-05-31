# 项目概览

## 项目定位

KnowFlow AI 是一个智能知识库问答平台。用户上传学习资料、项目文档或产品文档后，可以基于自己的资料进行检索增强问答。

项目当前已完成 **阶段 21：Chat SSE 流式输出、头像上传与 @ 文件上下文**。当前版本已经具备从本地开发到 Docker 全量启动的完整复现路径，并补齐文档质量指标、重新处理入口、文档摘要、原始来源持久化、真正失败重试、持久化文档处理任务、可选 embedding、pgvector 向量字段、全文+语义混合检索、语义索引重建、用户级检索策略配置、全局后台任务中心、安全系统诊断、Chat SSE 流式输出、OSS 头像上传和当前知识库文档 `@` mention；`do.md` 作为本地任务输入文件已加入 `.gitignore`，不再作为项目文件提交。

## 当前能力

后端已完成：

- Spring Boot 单体后端。
- PostgreSQL 数据库接入。
- Flyway 数据库迁移。
- 注册、登录、JWT 鉴权、重置密码、当前用户资料。
- 知识库 CRUD，支持 `featured` 和 `themeId`。
- 知识库成员协作权限：`OWNER`、`EDITOR`、`VIEWER`。
- 文档上传、解析、切片、索引状态流转。
- 文档处理任务：上传和重新处理会创建持久化 job，记录任务类型、状态、进度、阶段、消息和脱敏错误。
- 支持 `.txt`、`.md`、`.markdown`、文本型 `.pdf`、`.docx`、`.html`、`.htm`。
- 文档质量指标：chunk 数、字符数、平均/最短/最长 chunk 长度和质量提示。
- 文档重新处理：`OWNER` / `EDITOR` 可优先基于保存的原始文件 bytes 或解析文本重新处理并替换 chunks；旧文档没有来源时回退已有 chunks，完全无来源时返回明确错误。
- 文档摘要：使用当前用户模型配置或环境兜底生成摘要，摘要不作为 Chat 引用来源。
- PostgreSQL 全文检索，返回相关度分数。
- 阶段 18 语义检索增强：配置 `KNOWFLOW_AI_EMBEDDING_MODEL` 后，文档处理会尝试写入 embedding，Search 和 Chat 通过全文分、语义分、混合分共同排序；未配置或 embedding 失败时自动降级为全文检索。
- 阶段 19 语义索引运维：支持文档级和知识库级语义索引重建，只刷新已有 chunks 的 embedding，不重新解析来源文本，也不影响全文检索可用性。
- 用户级 RAG 检索策略：Settings 可保存 `HYBRID` / `FULLTEXT`，并配置语义权重和全文权重。
- 阶段 20 后台任务中心：支持跨知识库查看当前用户可访问的文档处理任务，按状态筛选，重试失败/取消任务，取消排队/运行任务，并通过权限校验区分成员可见、编辑者可操作和非成员隐藏。
- 阶段 20 系统诊断：提供脱敏诊断接口，只返回数据库可达性、当前用户可见任务计数和模型兜底配置布尔状态，不暴露 Base URL、API Key、model、Authorization 或 JDBC URL。
- RAG/Chat：会话、消息、引用来源、最近 6 条以内上下文、后台生成状态、RAG 开关、生成打断和阶段 21 SSE 流式输出。
- 阶段 21 文件上下文：Chat 支持显式 `mentionedDocumentIds`，前端通过 `@` 选择当前知识库已索引文档；没有显式 mention 时，后端会对用户问题做文件标题感知匹配，帮助用户按标题指定文档内容。
- 阶段 21 头像：支持上传当前用户头像到阿里云 OSS，数据库只保存 object key，用户资料接口返回短期签名 `avatarUrl` 和 `avatarConfigured`。
- 用户级模型配置：Base URL、加密 API Key、Model、timeout。
- Settings 模型列表拉取和真实模型连接测试。
- 用户偏好：语言、时区。
- 今日交谈次数统计。
- 健康检查：`GET /api/health`。
- Docker Compose 全量运行支持。

前端已完成：

- axios API wrapper 和鉴权拦截。
- 登录、注册、找回密码入口接入真实接口。
- Dashboard、KnowledgeBases、Documents、Chat、Settings 接入真实后端。
- 知识库共享成员管理 UI。
- 文档上传、文档列表、文档详情、质量提示、重新处理、摘要生成、处理任务进度和检索测试区。
- 文档级和知识库级语义索引重建入口。
- `/Jobs` 全局任务中心：展示后台任务状态、进度、阶段、消息、上下文和安全诊断摘要，支持刷新、筛选、重试和取消。
- Chat 会话列表、消息列表、SSE 流式发送、模型选择、引用来源面板、未读会话和后台生成状态。
- Chat 生成中禁用 RAG/模型选择，发送按钮切换为“打断”；RAG 开关提供 hover 说明。
- Chat 输入框支持 `@` 当前知识库文档 mention，弹出文档列表和搜索框，发送时传递 `mentionedDocumentIds`。
- Settings 用户资料、模型配置、模型测试、偏好、RAG 参数和账号删除。
- Settings 账号资料区支持头像上传和删除，Header/Sidebar 使用头像签名 URL 回显。
- Header 未读角标和侧边栏今日交谈次数。

## 当前阶段状态

- 阶段 0-20 已完成。
- 阶段 21 已完成，并通过完整后端回归、前端构建和目标 ESLint。
- 阶段 17 为文档上传和重新处理新增 `document_processing_jobs` 持久化任务表。前端 Documents 页面会轮询活跃任务，展示进度、阶段、消息和失败原因，并在任务活跃时禁用重复重新处理。
- 阶段 18 新增可选 embedding 和混合检索。Search API 和 Chat RAG 共用 `DocumentRetrievalService`，返回 `hybridScore`、`fulltextScore`、`semanticScore`、`retrievalMode`，并保持 `score` 兼容字段。
- 阶段 19 新增语义索引重建任务和用户级检索策略。`FULLTEXT` 模式会跳过 embedding 查询，`HYBRID` 模式按用户配置权重排序。
- 阶段 20 新增全局后台任务中心、任务重试/取消、安全系统诊断和 `/Jobs` 前端页面。
- 阶段 20 已通过阶段专项后端测试、完整后端回归、前端构建和目标 ESLint。
- 阶段 21 新增 Chat SSE 流式输出、边流边保存、`@` 文件上下文、标题感知检索和 OSS 头像上传；专项后端测试覆盖流式事件、持久化 delta、打断防旧流写入、mention 权限、标题匹配和头像校验。
- `do.md` 修复已完成：Chat 模型选择、进入会话自动滚动、用户模型配置复用、Settings 模型测试、退出登录确认、引用来源跟随选中回答、未读角标、响应式问题、RAG tooltip、生成打断和 `.env` 本地模型兜底均已纳入阶段 14 收尾记录。
- 本轮收尾新增 `ragEnabled` 和生成打断接口，API 契约已同步到 `doc/API.md`。
- 完整 Chat 真实回答验收仍依赖用户在 `/Settings` 提供可用的真实模型 Base URL/API Key/Model；阶段 21 不内置 mock 模型服务。

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
- Sonner toasts

后端：

- Java 21
- Spring Boot
- Spring Web MVC
- Spring Security
- MyBatis
- PostgreSQL + pgvector
- Flyway
- Maven
- Docker Compose

## 架构

当前仍是单体后端，不是微服务。该结构适合当前学习、演示和 MVP 交付目标。

本地开发链路：

```text
Browser -> Vite Dev Server -> Spring Boot Backend -> PostgreSQL
```

Docker 全量链路：

```text
Browser -> frontend Nginx container -> backend Spring Boot container -> postgres container
```

主要后端模块：

- `auth`：注册、登录、JWT、当前用户资料。
- `config`：Security、JWT、跨域和环境配置。
- `knowledgebase`：知识库 CRUD 和成员权限。
- `document`：文档上传、解析、切片、全文检索、处理任务进度和语义索引重建。
- `document.rag`：阶段 18/19 检索统一入口、embedding 客户端、全文/语义混合召回、权重策略和降级。
- `chat`：会话、消息、未读、后台生成状态、今日交谈次数、SSE 流式输出和文件上下文解析。
- `rag`：检索结果转 Prompt、模型调用适配、引用来源。
- `settings`：用户模型配置、模型测试、偏好、RAG 参数。
- `system`：脱敏系统诊断，返回数据库可达性、任务计数和模型兜底配置布尔状态。
- `user`：用户数据访问和头像 object key 元数据。

数据库核心表：

- `users`
- `knowledge_bases`
- `knowledge_base_members`
- `documents`
- `document_processing_jobs`
- `document_chunks`
- `chat_sessions`
- `chat_messages`
- `chat_message_sources`
- `user_model_settings`
- `user_preferences`
- `user_rag_settings`

## 本地开发命令

安装依赖：

```powershell
pnpm install
```

启动本地 PostgreSQL：

```powershell
pnpm sql
```

启动后端：

```powershell
pnpm backend
```

启动前端：

```powershell
pnpm dev
```

构建前端：

```powershell
pnpm build
```

后端测试：

```powershell
cd backend
.\mvnw.cmd test
```

后端打包：

```powershell
cd backend
.\mvnw.cmd -DskipTests package
```

默认地址：

- 前端开发服务：`http://localhost:5173`
- 后端服务：`http://localhost:8080`
- 后端健康检查：`http://localhost:8080/api/health`

## Docker 运行方式

复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，替换：

- `POSTGRES_PASSWORD`
- `KNOWFLOW_JWT_SECRET`
- `KNOWFLOW_MODEL_SECRET_KEY`
- 可选 AI 兜底：`KNOWFLOW_AI_BASE_URL`、`KNOWFLOW_AI_API_KEY`、`KNOWFLOW_AI_MODEL`
- 端口：`KNOWFLOW_FRONTEND_PORT`、`KNOWFLOW_BACKEND_PORT`、`KNOWFLOW_POSTGRES_PORT`

启动：

```powershell
docker compose up -d --build
```

根目录 `compose.yaml` 要求 `POSTGRES_PASSWORD`、`KNOWFLOW_JWT_SECRET` 和 `KNOWFLOW_MODEL_SECRET_KEY` 必须由 `.env` 或 `--env-file` 提供，缺少这些变量时会拒绝启动。

检查：

```powershell
docker compose ps
curl http://localhost:8080/api/health
```

查看日志：

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

停止：

```powershell
docker compose down
```

## 环境变量说明

PostgreSQL：

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `KNOWFLOW_POSTGRES_PORT`

JWT：

- `KNOWFLOW_JWT_SECRET`

用户模型 API Key 加密：

- `KNOWFLOW_MODEL_SECRET_KEY`

可选 AI 兜底：

- `KNOWFLOW_AI_BASE_URL`
- `KNOWFLOW_AI_API_KEY`
- `KNOWFLOW_AI_MODEL`
- `KNOWFLOW_AI_EMBEDDING_MODEL`
- `KNOWFLOW_AI_TIMEOUT_SECONDS`

头像 OSS：

- `KNOWFLOW_OSS_ENDPOINT`
- `KNOWFLOW_OSS_BUCKET`
- `KNOWFLOW_OSS_ACCESS_KEY_ID`
- `KNOWFLOW_OSS_ACCESS_KEY_SECRET`
- `KNOWFLOW_OSS_AVATAR_PREFIX`
- `KNOWFLOW_OSS_SIGNED_URL_TTL_SECONDS`

服务端口：

- `KNOWFLOW_FRONTEND_PORT`
- `KNOWFLOW_BACKEND_PORT`

连接池：

- `KNOWFLOW_DB_MAX_POOL_SIZE`
- `KNOWFLOW_DB_MIN_IDLE`

生产环境不要把真实数据库密码、JWT secret、模型加密密钥、模型 API Key 或 OSS AccessKey 提交到仓库。

## 健康检查、OpenAPI 和运维

健康检查：

```powershell
curl http://localhost:8080/api/health
```

Swagger/OpenAPI：

- 当前权威接口文档是 `doc/API.md`。
- 如果启用 springdoc/OpenAPI UI，可检查 `/swagger-ui/index.html` 和 `/v3/api-docs`。

PostgreSQL 备份：

```powershell
docker compose exec -T postgres pg_dump -U knowflow -d knowflow > knowflow-backup.sql
```

PostgreSQL 恢复：

```powershell
Get-Content .\knowflow-backup.sql | docker compose exec -T postgres psql -U knowflow -d knowflow
```

## 验收边界

阶段 14 Docker 化和运维验证已完成：

- `pnpm build` 已通过。
- 目标 ESLint 已通过。
- `cd backend && .\mvnw.cmd -DskipTests package` 已通过。
- `cd backend && .\mvnw.cmd test` 已通过，71 个测试全部成功。
- `docker compose config` 已通过。
- `docker compose up -d --build` 已通过，PostgreSQL、backend、frontend 均成功启动。
- Compose 已验证关键 secrets 必须由 `.env` 或 `--env-file` 提供，缺少 `POSTGRES_PASSWORD`、`KNOWFLOW_JWT_SECRET` 或 `KNOWFLOW_MODEL_SECRET_KEY` 时会拒绝启动。
- `http://localhost:8080/api/health` 返回 `{"status":"UP"}`。
- `http://localhost:5173/api/health` 经前端 Nginx 代理返回 `{"status":"UP"}`。
- browser-use 可见窗口已验证 Docker 前端可访问、空库注册登录可用、`/Settings` 可访问、`/Chat` 空状态可用、创建知识库后可进入 Chat 主界面。
- 未配置真实模型时在 Chat 发送“你好”返回脱敏提示 `Model settings are incomplete`，符合本阶段“不内置 mock 模型服务”的验收边界。

用户仍需人工提供真实模型配置，才能完成 browser-use 或人工的完整 Chat 真实回答验收：

1. `/Settings` 保存真实 Base URL/API Key/Model。
2. 点击模型测试并确认成功。
3. `/Chat/{sessionId}` 选择模型并发送问题。
4. 验证有命中文档时显示引用来源；无命中文档时 `sources` 为空且不伪造引用。
5. 验证后台生成完成后未读角标按 `unread` 统计。

## 后续扩展

- 阶段 18/19 已完成可选 embedding、pgvector 字段、全文+语义混合检索、语义索引重建和召回权重可配置；阶段 21 已完成 Chat SSE 流式输出。
- 向量索引后台重建和检索权重调优。
- OCR。
- PPT/Excel 文档解析。
- 团队空间和复杂组织权限。
- Agent 工作流。
- 生产级观测、告警和部署流水线。
