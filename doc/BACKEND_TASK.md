# 后端任务书：阶段 20 后台任务中心与系统诊断

本文档是后端 Agent 的固定入口。后端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 20 后端已完成，并已通过 PostgreSQL 完整后端集成回归。**

阶段 20 在阶段 17-19 的文档处理任务基础上，把任务能力从 Documents 局部进度展示扩展为全局任务中心，并新增脱敏系统诊断接口。目标是让用户能跨知识库查看自己可访问的后台任务，重试失败或取消的任务，取消仍在排队/运行的任务，同时保证协作权限隔离和敏感信息不外泄。

## 已完成后端实现

核心改动：

- `DocumentProcessingJobRepository`
  - 新增按当前用户可访问知识库查询全局任务列表。
  - 新增 `ACTIVE` 语义支持，等价于 `QUEUED` + `RUNNING`。
  - 新增当前用户可见的活跃任务数、失败任务数统计。
  - 新增 `markCanceled`。
  - `markRunning`、`markSucceeded`、`markFailed` 改为带状态条件的安全更新，避免取消后的异步迟到结果覆盖 `CANCELED`。
- `DocumentProcessingJobService`
  - 新增全局任务列表、任务重试、任务取消和诊断计数能力。
  - 重试 `FAILED` / `CANCELED` 任务时创建新任务，不修改旧终态任务。
  - 取消 `QUEUED` / `RUNNING` 任务时采用协作式取消语义：不强杀线程，但阻止迟到结果继续落库为成功或失败。
  - 通过 `KnowledgeBaseAccessService` 复用协作权限判断，确保成员可见、`OWNER`/`EDITOR` 可操作、`VIEWER` 权限不足返回 `403`、非成员返回 `404`。
- `DocumentController`
  - 新增 `GET /api/document-processing-jobs?status=&limit=`。
  - 新增 `POST /api/document-processing-jobs/{jobId}/retry`。
  - 新增 `POST /api/document-processing-jobs/{jobId}/cancel`。
  - 统一处理状态筛选参数，`ACTIVE` 映射为活跃状态集合。
- `SystemDiagnosticsController`
  - 新增 `GET /api/system/diagnostics`。
  - 返回数据库可达性、当前用户可见任务计数和模型兜底配置布尔状态。
  - 不返回 Base URL、API Key、encryptedApiKey、model、Authorization、JDBC URL 或完整异常堆栈。

## 权限与安全规则

- 全局任务列表只返回当前用户可访问知识库下的任务。
- `OWNER` / `EDITOR` 可以重试失败或取消任务，也可以取消排队或运行任务。
- `VIEWER` 可以看到可访问知识库下的任务，但执行重试或取消返回 `403`。
- 非成员访问单个任务、重试任务或取消任务返回 `404`，避免暴露资源存在性。
- 重试只允许 `FAILED` / `CANCELED`；对其他状态返回 `409`。
- 取消只允许 `QUEUED` / `RUNNING`；对终态任务返回 `409`。
- 任务消息和错误继续做脱敏处理，不暴露模型供应商敏感信息或服务器内部细节。

## 测试覆盖

新增测试：

- `Stage20DocumentTaskCenterTests`

覆盖重点：

- 全局任务中心列表只返回当前用户可访问知识库下的任务。
- `ACTIVE` 筛选返回 `QUEUED` / `RUNNING`。
- `OWNER` / `EDITOR` 可以重试 `FAILED` / `CANCELED` 任务，旧任务保持终态，新任务记录新的处理尝试。
- `VIEWER` 重试或取消返回 `403`。
- 非成员重试或取消返回 `404`。
- 取消后的任务不会被迟到的 `markRunning`、`markSucceeded` 或 `markFailed` 覆盖。
- 系统诊断接口只返回安全字段，不泄露 API Key、Base URL、model 或 Authorization。
- 阶段 7-20 既有回归仍通过。

## 验证命令与结果

已运行：

```powershell
cd backend
.\mvnw.cmd -Dtest=Stage20DocumentTaskCenterTests test
.\mvnw.cmd test
```

结果：

- 阶段 20 专项测试通过。
- 后端完整测试通过，105 个测试全部成功。

后续如继续修改阶段 20 后端代码，至少重新运行：

```powershell
cd backend
.\mvnw.cmd test
```
