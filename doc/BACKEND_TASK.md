# 后端任务书：阶段 17 后台任务化与文档处理进度

本文档是后端 Agent 的固定入口。后端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 17 后端已完成，并已通过 PostgreSQL 完整后端集成回归。**

阶段 17 把文档上传和重新处理从“只看最终文档状态”升级为“有持久化处理任务和可轮询进度”。本阶段不引入 MQ、OCR、PPT/Excel、embedding/pgvector、SSE 或复杂任务中心。

## 数据库变更

新增 Flyway 迁移：

- `V13__create_document_processing_jobs.sql`

新增表：

- `document_processing_jobs`

字段：

- `id`
- `document_id`
- `knowledge_base_id`
- `requested_by`
- `job_type`：`UPLOAD_INDEX` / `REPROCESS`
- `status`：`QUEUED` / `RUNNING` / `SUCCEEDED` / `FAILED` / `CANCELED`
- `progress_percent`：0-100 的粗粒度进度
- `stage`：阶段码，例如 `QUEUED`、`READ_SOURCE`、`EXTRACT_TEXT`、`SPLIT_CHUNKS`、`WRITE_CHUNKS`、`COMPLETED`、`FAILED`
- `message`：脱敏用户可读进度消息
- `error_message`：脱敏失败原因
- `started_at`
- `finished_at`
- `created_at`
- `updated_at`

设计说明：

- 任务表独立于 `documents`，因为一个文档可以上传一次但被多次重新处理。
- `documents.status` 继续表示当前可检索材料化状态；`document_processing_jobs.status` 表示某次处理尝试的状态。
- 进度使用固定里程碑，不伪造字节级进度，因为当前解析器没有可靠的流式进度。

## 已完成接口

### 上传文档

- `POST /api/knowledge-bases/{knowledgeBaseId}/documents`
- 创建文档记录后创建 `UPLOAD_INDEX` 任务。
- 同步模式下会立即执行任务并返回终态。
- 后台模式下可返回 `PROCESSING`，前端通过任务接口轮询。

### 重新处理文档

- `POST /api/documents/{documentId}/reprocess`
- 创建 `REPROCESS` 任务。
- 保持阶段 16 来源优先级：`source_bytes` -> `source_text` -> 旧 chunks fallback。
- 只有 `OWNER` / `EDITOR` 可调用；`VIEWER` 返回 `403`，非成员返回 `404`。

### 查询处理任务

- `GET /api/knowledge-bases/{knowledgeBaseId}/document-processing-jobs?limit=20`
- `GET /api/documents/{documentId}/processing-jobs?limit=10`
- `GET /api/document-processing-jobs/{jobId}`

权限规则：

- 知识库成员可查看该知识库内文档处理任务。
- 非成员访问任务、文档或知识库任务列表返回 `404`，避免暴露资源存在性。
- `limit` 最小为 1，最大为 50，默认 20。

## 后端实现要点

1. 控制器职责
   - `DocumentController` 只负责权限、文件基础校验、文档记录创建、任务创建和启动。
   - 解析、切片、事务写入和失败状态流转下沉到 `DocumentProcessingJobService`。

2. 任务执行
   - `DocumentProcessingJobRunner` 根据 `knowflow.documents.processing.async-enabled` 决定同步执行或交给后台 worker。
   - 默认同步，便于现有测试和旧阶段契约保持确定性。
   - `DocumentProcessingAsyncWorker` 单独作为 Spring Bean 承载 `@Async`，避免同类 self-invocation 导致异步失效。

3. 状态流转
   - 创建任务后立即把文档置为 `PROCESSING`。
   - 开始执行时任务置为 `RUNNING`。
   - 文本提取、切片、写 chunks 使用固定进度阶段。
   - 成功后文档置为 `INDEXED`，任务置为 `SUCCEEDED`。
   - 失败后文档置为 `FAILED`，任务置为 `FAILED`，错误必须脱敏。

4. 事务规则
   - 写 chunks 和更新文档最终状态在事务内完成。
   - 重新处理失败不能留下半替换 chunks。

5. 注释要求
   - 新增或修改的后端功能代码必须保留有价值注释，说明功能、关键参数、参数含义、与旧逻辑区别。
   - 优先注释 DTO 字段语义、任务状态流转、同步/异步选择、失败脱敏、任务表与文档表关系。

## 测试覆盖

已新增：

- `DocumentProcessingJobRunnerTests`
  - 异步开启时委托 `DocumentProcessingAsyncWorker`。
  - 异步关闭时直接调用 `DocumentProcessingJobService`。

- `Stage17DocumentProcessingJobTests`
  - 上传创建成功任务，进度和历史字段可查询。
  - editor 可重新处理并替换 chunks。
  - viewer 可读任务但不能创建重新处理任务。
  - 非成员不能读取处理任务。
  - 上传失败会创建失败任务并写入脱敏错误。

## 验证命令

无需数据库的验证：

```powershell
cd backend
.\mvnw.cmd -Dtest=DocumentProcessingJobRunnerTests test
.\mvnw.cmd -DskipTests package
```

需要 PostgreSQL 的验证：

```powershell
cd backend
.\mvnw.cmd -Dtest=Stage17DocumentProcessingJobTests test
.\mvnw.cmd "-Dtest=Stage15DocumentQualityTests,Stage16DocumentRetryTests,Stage17DocumentProcessingJobTests" test
.\mvnw.cmd test
```

当前环境如果 `localhost:5432` 未启动，不要擅自启动数据库；先向用户确认是否需要启动并在验证后保留或关闭。

## 最终验收结果

- `cd backend && .\mvnw.cmd test` 已通过，91 个测试全部成功。
- Flyway 已验证 13 个迁移，`document_processing_jobs` 迁移包含在完整回归中。
- 阶段 17 新增的 `DocumentProcessingJobRunnerTests` 和 `Stage17DocumentProcessingJobTests` 已纳入完整回归并通过。
