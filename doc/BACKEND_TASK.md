# 后端任务书：阶段 14 部署与运维收尾

本任务书是后端会话的固定入口。后续每个阶段都复用本文件，由文档会话实时更新当前任务。后端会话必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文件。

## 必读规则

- 后端现在默认由 Agent 正常直接开发。请按任务书直接修改后端业务代码、测试代码和必要配置，并运行相关验证命令；不要只输出教学代码，除非用户明确要求只讲解或只给代码片段。
- 不要修改已经执行过的 Flyway 迁移文件；如果确实需要表结构或索引变化，只能新增迁移文件。
- 任何接口路径、请求体、响应体或错误语义变化，都必须提醒文档会话同步 `doc/API.md`。
- 新增或修改功能代码时，必须写有价值的业务注释或 JavaDoc，说明实现了什么功能、有哪些关键参数、参数含义是什么、与旧逻辑的区别是什么；不要给 import、基础注解、getter/setter 写噪声注释。
- 注释重点覆盖配置读取、密钥脱敏、健康检查、日志、备份恢复、启动脚本和部署参数；不要为了注释而注释。

## 当前目标

阶段 14：部署与运维。

目标不是继续新增业务功能，而是让当前后端更容易本地复现、打包、部署、排查和备份恢复。重点整理环境变量、Spring profile、Docker Compose、启动脚本、健康检查、日志策略、Swagger/OpenAPI 暴露策略和 README 后端部分。

## 本轮任务

1. 梳理后端配置：
   - 数据库连接。
   - JWT 密钥和过期时间。
   - 模型供应商兜底配置。
   - 用户 API Key 加密密钥。
   - Swagger/OpenAPI 是否在生产启用。
   - 日志级别。
2. 补齐环境变量示例：
   - 可以新增或更新 `.env.example`、`backend/.env.example` 或文档中的环境变量表。
   - 只写占位值，不写真实密钥、真实 API Key、生产数据库密码。
3. 检查本地和生产 profile：
   - local profile 可以保留学习联调用默认值。
   - 非 local 或生产环境必须明确由环境变量覆盖敏感配置。
   - 如果需要新增 `application-prod.yaml`，确保不写入真实密钥。
4. 检查 Docker Compose 和启动脚本：
   - 数据库启动流程清晰。
   - 后端如何连接数据库清晰。
   - 如新增脚本，脚本必须可读、可维护，并避免写死个人绝对路径。
5. 补齐健康检查和日志说明：
   - `GET /api/health` 的用途。
   - 常见启动失败如何排查，例如数据库不可达、Flyway 失败、JWT 配置缺失、模型加密密钥缺失。
   - 生产环境 Swagger/OpenAPI 暴露建议。
6. 补齐 PostgreSQL 备份和恢复说明：
   - 提供 `pg_dump` 或 Docker 容器内执行命令。
   - 提供恢复命令。
   - 说明备份文件不要提交仓库。
7. 不新增业务接口，不改变阶段 13 API 语义。
8. 不把 API Key、Authorization header、数据库密码或 JWT 密钥写入日志、README 或示例文件。

## 建议涉及文件

可能修改：

- `README.md`
- `backend/src/main/resources/application.yaml`
- `backend/src/main/resources/application-local.yaml`
- `backend/src/main/resources/application-prod.yaml`
- `backend/docker-compose.yml` 或根目录 Docker Compose 文件
- `.env.example`
- `backend/.env.example`
- `doc/PROJECT.md`
- 与部署、启动、备份相关的文档

不应修改：

- 已执行的 Flyway 迁移文件。
- 与阶段 14 无关的业务 Service/Controller。
- 真实密钥、真实 API Key、真实生产数据库配置。

## 验收命令

```powershell
cd backend
.\mvnw.cmd test
```

如修改了打包或配置，也建议运行：

```powershell
cd backend
.\mvnw.cmd package
```

如果因为本地环境缺少 Docker 或数据库导致无法验证，要说明缺失项和替代验证结果。

## 手动验收说明

完成后给用户一份简短可执行步骤：

1. 如何启动 PostgreSQL。
2. 如何运行后端测试。
3. 如何启动后端。
4. 如何访问健康检查。
5. 如何生成数据库备份。
6. 如何从备份恢复。
7. 生产部署前必须配置哪些环境变量。

## 完成后输出

完成后请输出：

1. 修改了哪些文件。
2. 后端环境变量和 profile 如何整理。
3. Docker Compose 或启动脚本如何使用。
4. 数据库备份和恢复命令是什么。
5. 健康检查、日志和 Swagger/OpenAPI 的生产建议。
6. 运行了哪些校验命令和结果。
7. 仍需用户手动确认的部署参数。
