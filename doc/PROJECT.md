# 项目概览

## 项目定位

KnowFlow AI 是一个智能知识库问答平台。目标是让用户上传学习资料、项目文档或产品文档后，可以基于自己的资料进行问答。

阶段 13：用户模型配置、偏好设置与多会话协同增强已完成。项目已经具备文档上传、切片、PostgreSQL 全文检索、非流式 RAG 问答、最近 6 条以内多轮上下文、引用来源、会话保存、会话管理、Settings 真实接后端、前端体验整理、后端稳定性测试、单个知识库共享协作、用户级 OpenAI-compatible 配置、语言时区、未读会话、后台生成和今日交谈次数能力。当前进入阶段 14：部署与运维 + `do.md` 修复，先处理 Chat 模型选择、Settings 模型测试、引用来源和响应式体验问题，再继续推进环境配置、启动复现、构建产物、部署脚本、日志健康检查和数据库备份恢复。

- 前端页面能调用真实后端接口。
- 后端能连接 PostgreSQL。
- 数据库结构由 Flyway 管理。
- 用户可以注册、登录。
- 前端可以读取后端知识库和文档数据。

阶段 6 第一版复用阶段 5 的 PostgreSQL 关键词检索结果构造 prompt，已完成非流式问答、引用来源、会话和消息保存，并补齐会话重命名、删除、置顶/取消置顶。`/Chat/{sessionId}` 切换会话时只刷新消息区域，`/KnowledgeBases/{id}` 只保留文档检索测试区。阶段 9 已将普通关键词匹配升级为 PostgreSQL 全文检索；阶段 10 已补齐非流式多轮上下文和引用来源体验；阶段 13 已支持空检索仍调用当前用户模型配置生成回答但 `sources` 为空；embedding、pgvector、流式输出和多模型选择仍放在后续扩展。

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
- 知识库接口已升级为成员权限模型，让当前用户可访问自己创建和别人共享的知识库。
- 知识库支持 `featured` 精选标记和 `themeId` 主题色字段。
- 文档上传、文档解析、文档切片和 `INDEXED` / `FAILED` 状态流转；阶段 11 已从 TXT、Markdown、文本型 PDF 扩展到 `.docx` 和 `.html/.htm`。
- 文档列表、详情、删除和 chunk 查询接口。
- 知识库内文档关键词检索接口：`POST /api/knowledge-bases/{knowledgeBaseId}/search`。
- RAG/Chat 接口：创建会话、会话列表、修改会话、删除会话、消息列表、发送问题并保存引用来源。
- RAG 体验增强：发送问题时默认加入当前会话最近 6 条以内历史消息；空检索仍调用当前用户模型配置生成回答但不保存引用来源；引用来源与实际 prompt 上下文保持一致。
- 知识库成员协作：`OWNER` 管理成员和删除知识库，`EDITOR` 维护文档和内容，`VIEWER` 只读检索与问答。
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
- Chat 页面已接入阶段 10 RAG 体验增强，支持发送中状态、防重复提交、空引用来源提示、引用片段截断/展开和更明确的失败提示。
- `/KnowledgeBases/{id}` 当前只保留文档检索测试区，不再承载 RAG 对话入口。
- Dashboard 已改为从真实知识库、文档和会话接口汇总当前账号状态，不再使用旧静态 mock 统计。
- KnowledgeBases 和 Chat 会通过现有文档列表接口补齐文档数、chunk 数和可检索来源数。
- Settings 已接入真实后端：邮箱资料、用户级模型配置、语言时区偏好、RAG 参数和删除当前账号。
- 阶段 13 前端已接入用户级模型配置表单、动态模型列表、语言时区保存、Chat 未读/生成中状态、顶部未读角标和侧边栏今日交谈次数；API Key 由后端加密保存，前端不明文回显，Base URL 可由后端回显用于刷新后继续获取模型列表；模型配置不再提供单独清除 API Key 入口，空 API Key 不覆盖，重新填写才覆盖。
- 阶段 14 `do.md` 修复已把 Settings 的模型选择/手动输入合并为一个控件，新增真实模型测试按钮；Chat 输入区可选择模型并随发送同步当前用户 Settings，右侧引用来源跟随选中的助手回答展示。

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
- `chat_sessions`：支持 `pinned`、`unread` 和生成状态字段，用于会话置顶、未读提醒和异步生成状态展示。
- `chat_messages`
- `chat_message_sources`：阶段 6 建议新增，用于保存回答引用来源。
- `knowledge_base_members`：用于保存知识库成员和 `OWNER` / `EDITOR` / `VIEWER` 角色。
- `user_model_settings`：阶段 13 已新增，用于保存当前用户的模型 Base URL、加密 API Key、模型名和超时时间。
- `user_preferences`：阶段 13 已新增，用于保存当前用户语言和时区偏好。

当前 RAG 问答链路：

```text
Frontend Chat UI
  -> Chat Controller
  -> 校验当前用户、会话、知识库访问权限
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

1. 阶段 14 先完成 `do.md` 中影响真实使用和演示稳定性的 Chat/Settings/Header 修复。
2. Chat 发送支持可选模型，后端按当前用户隔离读取 Base URL/API Key，并同步 Settings 当前模型。
3. Settings 模型配置支持真实模型测试，模型列表和测试都可复用已保存配置。
4. Header 未读角标只按 `unread === true` 统计；后台生成成功或失败都会产生未读提醒，成功/失败状态由 `status` 单独表达。
5. 继续推进部署与运维收尾：环境变量、密钥管理、构建产物、Docker Compose 或等价启动脚本、日志健康检查、备份恢复和 README。
6. 阶段 14 收尾时仍需通过 `pnpm build`、目标前端检查和 `cd backend && .\mvnw.cmd test`。

协作方式：

- 前后端协调开发由当前协调者按任务需要创建和管理 `AGENT_TEAM`，不再默认让用户复制前端/后端任务提示到新会话。
- 后端默认直接实现和验证；只有用户明确要求“后端不要直接修改/我自己写/只教学”时，才改为只给说明、代码片段和测试命令。

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

阶段 13 模型配置建议：

```properties
# 本地开发兜底配置：用户未保存模型配置时可以使用
knowflow.ai.base-url=
knowflow.ai.api-key=
knowflow.ai.model=
knowflow.ai.timeout-seconds=60

# 用户级 API Key 加密密钥：local profile 已提供学习联调用默认值；非 local 或生产环境应由环境变量覆盖
knowflow.model.secret-key=
```

密钥不要把生产值写入仓库。阶段 13 默认按 OpenAI-compatible Chat Completions 和 `/models` 风格设计；用户自己的 API Key 只能加密保存，接口和前端都不能明文回显。

Flyway 规则：已经执行过的迁移文件不要修改；后续表结构变化新增 `V4__...sql`、`V5__...sql` 等迁移文件。
