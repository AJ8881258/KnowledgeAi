# 后端任务书/验收记录：阶段 14 Docker 化与运维收尾

本文档是后端 Agent 的固定入口。后续阶段继续复用本文件，由协调者更新当前任务和验收记录。后端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 14 已完成。**

阶段 14 目标是完成 Docker 化和运维收尾，并记录 `do.md` 中影响真实使用的 Chat/Settings/Header 修复完成情况。本轮文档收尾没有修改 API 契约，`doc/API.md` 不需要变更。

## 阶段 14 后端完成记录

已完成能力：

- Docker Compose 全量运行已形成交付路径：PostgreSQL、Spring Boot 后端、前端 Nginx。
- 后端容器通过环境变量读取数据库、JWT、用户模型 API Key 加密密钥、可选 AI 兜底配置。
- `SPRING_DOCKER_COMPOSE_ENABLED=false` 用于容器化部署，避免后端容器再尝试控制 Docker。
- `GET /api/health` 可用于健康检查。
- 用户级模型配置继续按当前 JWT 用户隔离读取：
  - Base URL 可回显用于继续编辑。
  - API Key 加密保存，不明文返回。
  - 空 API Key 保存时保留已有 Key，非空时覆盖。
- Chat 请求级 `model` 只覆盖本次生成模型并同步为当前用户 Settings 模型，不覆盖 Base URL/API Key。
- Chat 模型调用优先使用当前用户保存的模型配置；用户没有完整配置时才允许使用后端环境变量兜底。
- Settings 模型测试接口复用当前表单或已保存配置，成功/失败均脱敏。
- 空检索时仍允许调用当前用户模型回答，但 `sources` 保持空数组，不伪造引用来源。
- 后台生成成功或失败都可以产生未读提醒；成功/失败状态通过 `status` 表达，未读只由 `unread` 表达。
- README 已补充后端相关运维说明：环境变量、健康检查、日志排查、构建、PostgreSQL 备份恢复。

## 验收记录

阶段 14 后端侧验收口径：

- 本地后端启动命令：`pnpm backend`。
- 本地 PostgreSQL 启动命令：`pnpm sql`。
- 后端构建命令：`cd backend && .\mvnw.cmd -DskipTests package`。
- 后端测试命令：`cd backend && .\mvnw.cmd test`。
- Docker 全量启动命令：`docker compose up -d --build`。
- 健康检查：`GET /api/health`。
- 运维排查：`docker compose logs -f backend`、`docker compose ps`。

本次协调者已完成后端侧验证：

- `cd backend && .\mvnw.cmd -DskipTests package`：通过。
- `cd backend && .\mvnw.cmd test`：通过，67 个测试全部成功。
- `docker compose config`：通过。
- `docker compose up -d --build`：通过，PostgreSQL、backend、frontend 均成功启动。
- Compose 已验证关键 secrets 必须由 `.env` 或 `--env-file` 提供，缺少 `POSTGRES_PASSWORD`、`KNOWFLOW_JWT_SECRET` 或 `KNOWFLOW_MODEL_SECRET_KEY` 时会拒绝启动。
- `Invoke-RestMethod http://localhost:8080/api/health`：返回 `{"status":"UP"}`。
- `Invoke-RestMethod http://localhost:5173/api/health`：经前端 Nginx 代理返回 `{"status":"UP"}`。
- `docker compose logs backend --tail 120`：后端启动、Flyway 9 个迁移和健康检查正常；未发现 API Key、Authorization header 或真实密钥明文输出。

## 剩余人工验收条件

完整 Chat 真实回答验收必须由用户提供真实模型配置：

1. 在 `/Settings` 保存真实 OpenAI-compatible Base URL、API Key、Model。
2. 调用 Settings 模型测试并确认成功。
3. 在 `/Chat/{sessionId}` 选择模型并发送问题。
4. 确认助手回答生成成功。
5. 有检索命中时确认引用来源来自真实文档 chunk；无检索命中时确认 `sources` 为空。
6. 模型调用失败时确认错误脱敏，不暴露 API Key、Authorization header、完整 Base URL 或供应商原始敏感错误。

## 后续阶段建议

阶段 14 已收尾。后续如果继续扩展后端，建议从以下方向新开阶段：

- Embedding / pgvector 向量检索。
- SSE 流式输出。
- 后台任务队列和重试机制。
- OCR、PPT、Excel 文档解析。
- 更完整的生产观测、告警和部署流水线。

新增接口或接口语义变化时，必须先同步 `doc/API.md`。
