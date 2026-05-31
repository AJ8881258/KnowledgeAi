# KnowFlow AI

KnowFlow AI 是一个 RAG-based 智能知识库问答平台。用户可以上传学习资料、项目文档或产品文档，系统会解析、切片、索引文档，并基于知识库内容进行问答。

## 当前状态

项目当前处于 **阶段 18：语义检索与混合召回已完成**。

已完成的核心能力：

- 用户认证：注册、登录、JWT 鉴权、重置密码、当前用户资料。
- 知识库管理：创建、编辑、删除、精选标记、主题色、用户隔离。
- 协作权限：单个知识库成员共享，支持 `OWNER` / `EDITOR` / `VIEWER` 权限。
- 文档处理：支持 `.txt`、`.md`、`.markdown`、文本型 `.pdf`、`.docx`、`.html`、`.htm` 上传解析、切片和索引。
- 全文检索：基于 PostgreSQL 全文检索返回相关片段、相关度分数和引用来源。
- 语义/混合检索：配置 `KNOWFLOW_AI_EMBEDDING_MODEL` 后，文档处理会尝试写入 embedding，Search 和 Chat 以全文分、语义分、混合分排序；未配置或失败时自动降级全文检索。
- RAG 问答：基于检索结果构建 Prompt，调用 OpenAI-compatible 模型生成回答并保存引用来源。
- 用户级模型配置：每个用户可在 Settings 保存 Base URL、API Key、模型和超时时间；API Key 后端加密保存、脱敏返回。
- Settings 模型测试：支持用当前表单或已保存配置测试真实模型连接。
- 多会话协同：会话创建、重命名、删除、置顶、取消置顶、未读会话、后台生成状态。
- Chat 体验：发送时可选择模型，空检索仍可调用用户模型回答但 `sources` 保持为空；右侧引用来源跟随选中回答展示。
- 使用统计：侧边栏展示今日交谈次数，按当前用户和时区统计。
- Docker 化：根目录 `compose.yaml` 可启动 PostgreSQL、Spring Boot 后端和前端 Nginx 容器。

阶段 18 的完整 Chat 真实回答验收依赖用户提供可用的真实模型配置。没有真实 Base URL/API Key/Model 时，只能验证应用启动、接口健康、页面流程和脱敏错误；没有配置 `KNOWFLOW_AI_EMBEDDING_MODEL` 时，系统仍会使用全文检索。

## 技术栈

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
- PostgreSQL
- Flyway
- Maven
- Docker Compose

## 项目结构

```text
.
├── src/                         # 前端源码
│   ├── api/                     # axios API wrapper
│   ├── components/              # 共享和页面拆分组件
│   ├── hooks/                   # React hooks
│   ├── lib/                     # 工具函数
│   ├── pages/                   # 路由页面
│   └── store/                   # Zustand store
├── backend/                     # Spring Boot 后端
│   └── src/main/java/com/knowflow/backend/
│       ├── auth/                # 认证
│       ├── chat/                # 会话、消息、生成状态
│       ├── config/              # Security/JWT/配置
│       ├── document/            # 文档上传、解析、切片
│       ├── knowledgebase/       # 知识库和成员权限
│       ├── rag/                 # 检索、Prompt、模型调用
│       ├── settings/            # 用户模型配置、偏好、RAG 参数
│       └── user/                # 用户数据访问
├── doc/
│   ├── STAGE_PLAN.md            # 阶段计划和验收状态
│   ├── PROJECT.md               # 项目概览和运行方式
│   ├── API.md                   # API 契约
│   ├── FRONTEND_TASK.md         # 前端任务书/验收记录
│   └── BACKEND_TASK.md          # 后端任务书/验收记录
├── compose.yaml                 # 全量 Docker Compose
├── .env.example                 # Docker 环境变量模板
├── Dockerfile                   # 前端生产镜像
└── backend/Dockerfile           # 后端生产镜像
```

## 本地开发启动

环境要求：

- Node.js 18+
- pnpm
- Java 21+
- Docker Desktop 或兼容 Docker Compose 的运行环境

安装依赖：

```powershell
pnpm install
```

启动开发数据库：

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

默认访问地址：

- 前端开发服务：http://localhost:5173
- 后端 API：http://localhost:8080
- 健康检查：http://localhost:8080/api/health

本地开发链路：

```text
Browser -> Vite Dev Server -> Spring Boot Backend -> PostgreSQL
```

前端通过 Vite proxy 转发 `/api/**` 到 `http://localhost:8080/api/**`。

## Docker 全量启动

1. 复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

2. 编辑 `.env`，至少替换以下 secrets：

```text
POSTGRES_PASSWORD=CHANGE_ME_postgres_password
KNOWFLOW_JWT_SECRET=CHANGE_ME_use_a_long_random_jwt_secret_at_least_32_chars
KNOWFLOW_MODEL_SECRET_KEY=CHANGE_ME_use_a_long_random_model_secret_at_least_32_chars
```

3. 启动全量服务：

```powershell
docker compose up -d --build
```

根目录 `compose.yaml` 会要求 `POSTGRES_PASSWORD`、`KNOWFLOW_JWT_SECRET` 和 `KNOWFLOW_MODEL_SECRET_KEY` 存在；缺少这些变量时会直接拒绝启动，避免使用仓库里的弱默认密钥。

4. 查看容器状态：

```powershell
docker compose ps
```

5. 访问应用：

- 前端：http://localhost:5173
- 后端健康检查：http://localhost:8080/api/health

6. 停止服务：

```powershell
docker compose down
```

如果需要同时删除数据库卷，请确认数据可丢弃后再执行：

```powershell
docker compose down -v
```

## 构建

前端生产构建：

```powershell
pnpm build
```

后端 JAR 构建：

```powershell
cd backend
.\mvnw.cmd -DskipTests package
```

后端测试：

```powershell
cd backend
.\mvnw.cmd test
```

## 环境变量

| 变量 | 默认/示例 | 说明 |
|---|---|---|
| `KNOWFLOW_FRONTEND_PORT` | `5173` | 前端 Nginx 容器映射到宿主机的端口。 |
| `KNOWFLOW_BACKEND_PORT` | `8080` | Spring Boot 后端映射到宿主机的端口。 |
| `KNOWFLOW_POSTGRES_PORT` | `5432` | PostgreSQL 映射到宿主机的端口。 |
| `POSTGRES_DB` | `knowflow` | PostgreSQL 数据库名。 |
| `POSTGRES_USER` | `knowflow` | PostgreSQL 用户名。 |
| `POSTGRES_PASSWORD` | `CHANGE_ME...` | PostgreSQL 密码，生产环境必须替换。 |
| `KNOWFLOW_JWT_SECRET` | `CHANGE_ME...` | JWT 签名密钥，建议至少 32 个随机字符。 |
| `KNOWFLOW_MODEL_SECRET_KEY` | `CHANGE_ME...` | 用户模型 API Key 加密密钥。修改后，历史已保存 API Key 将无法解密。 |
| `KNOWFLOW_AI_BASE_URL` | 空 | 可选 OpenAI-compatible 兜底 Base URL，仅当用户未保存自己的模型配置时使用。 |
| `KNOWFLOW_AI_API_KEY` | 空 | 可选 AI 兜底 API Key。不要提交真实 Key。 |
| `KNOWFLOW_AI_MODEL` | 空 | 可选 AI 兜底模型名。 |
| `KNOWFLOW_AI_EMBEDDING_MODEL` | 空 | 可选 embedding 模型名；为空时保留全文检索，不写入语义向量。 |
| `KNOWFLOW_AI_TIMEOUT_SECONDS` | `60` | 模型调用超时时间。 |
| `KNOWFLOW_DB_MAX_POOL_SIZE` | `10` | Docker 后端数据库连接池最大连接数。 |
| `KNOWFLOW_DB_MIN_IDLE` | `1` | Docker 后端数据库连接池最小空闲连接数。 |

后端实际读取的数据库变量为：

- `KNOWFLOW_DB_URL`
- `KNOWFLOW_DB_USERNAME`
- `KNOWFLOW_DB_PASSWORD`
- `KNOWFLOW_DB_MAX_POOL_SIZE`
- `KNOWFLOW_DB_MIN_IDLE`

根目录 `compose.yaml` 会根据 `POSTGRES_*` 自动组装容器内数据库连接。

## 健康检查和接口文档

健康检查：

```powershell
curl http://localhost:8080/api/health
```

Docker 容器健康状态：

```powershell
docker compose ps
```

Swagger/OpenAPI：

- 当前 API 契约以 [doc/API.md](doc/API.md) 为准。
- 若后端启用 springdoc/OpenAPI UI，可检查 `http://localhost:8080/swagger-ui/index.html` 或 `http://localhost:8080/v3/api-docs`。
- 当前阶段 Docker 化没有改变接口契约。

## 日志排查

查看全部服务日志：

```powershell
docker compose logs -f
```

查看后端日志：

```powershell
docker compose logs -f backend
```

查看前端 Nginx 日志：

```powershell
docker compose logs -f frontend
```

查看 PostgreSQL 日志：

```powershell
docker compose logs -f postgres
```

常见排查点：

- 后端无法启动：检查 `.env` 中 `POSTGRES_PASSWORD`、`KNOWFLOW_JWT_SECRET`、`KNOWFLOW_MODEL_SECRET_KEY` 是否已设置。
- 修改 `.env` 中 `POSTGRES_PASSWORD` 后旧数据库卷不会自动改密码；本地演示环境可先备份数据，再执行 `docker compose down -v` 重新初始化数据库卷。
- 数据库连接失败：检查 `postgres` 容器是否 healthy，端口 `KNOWFLOW_POSTGRES_PORT` 是否被占用。
- Chat 生成失败：先在 `/Settings` 保存并测试真实 Base URL/API Key/Model；失败提示应脱敏，不应暴露密钥。
- 前端无法访问后端：Docker 全量模式下前端容器应通过 Nginx 代理请求后端；开发模式下检查 Vite proxy 和 `pnpm backend` 是否运行。

## PostgreSQL 备份和恢复

备份数据库到当前目录：

```powershell
docker compose exec -T postgres pg_dump -U $env:POSTGRES_USER -d $env:POSTGRES_DB > knowflow-backup.sql
```

如果 PowerShell 当前没有加载 `.env` 变量，也可以直接使用默认用户名和库名：

```powershell
docker compose exec -T postgres pg_dump -U knowflow -d knowflow > knowflow-backup.sql
```

恢复数据库：

```powershell
Get-Content .\knowflow-backup.sql | docker compose exec -T postgres psql -U knowflow -d knowflow
```

恢复前建议先确认目标库可覆盖，并保留当前数据备份。

## 主要 API 文档

详见 [doc/API.md](doc/API.md)。常用入口：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/knowledge-bases`
- `POST /api/knowledge-bases/{knowledgeBaseId}/documents`
- `POST /api/knowledge-bases/{knowledgeBaseId}/search`
- `POST /api/knowledge-bases/{knowledgeBaseId}/chat/sessions`
- `POST /api/chat/sessions/{sessionId}/messages`
- `GET /api/chat/usage/today`
- `GET/PATCH /api/settings/model`
- `POST /api/settings/model/models`
- `POST /api/settings/model/test`

## 文档

- [阶段计划](doc/STAGE_PLAN.md)
- [项目概览](doc/PROJECT.md)
- [API 契约](doc/API.md)
- [前端任务书/验收记录](doc/FRONTEND_TASK.md)
- [后端任务书/验收记录](doc/BACKEND_TASK.md)

## 后续可扩展方向

- 向量索引后台重建和混合召回权重调优。
- SSE/流式输出。
- 扫描版 PDF OCR。
- PPT/Excel 文档解析。
- 团队空间和更复杂组织权限。
- Agent 工作流。
- 更完整的后台管理系统。

## License

MIT License
