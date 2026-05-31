# 前端任务书：阶段 20 后台任务中心与系统诊断

本文档是前端 Agent 的固定入口。前端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 20 前端已完成，并已通过构建和目标 ESLint。**

阶段 20 前端新增 `/Jobs` 全局后台任务中心，让用户可以跨知识库查看自己可访问的文档处理任务，按状态筛选，刷新或轮询活跃任务，对失败/取消任务发起重试，对排队/运行任务发起取消，并查看脱敏系统诊断摘要。

## API 接入

继续使用现有 axios wrapper：

- `src/api/documents.ts`
- `src/api/system.ts`

不新增直接 `fetch`，不新增组件级 `localStorage`，不新增 mock-only 任务数据。

新增/扩展类型字段：

```ts
type DocumentProcessingJobStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

type SystemDiagnosticsResponse = {
  status: "OK" | "DEGRADED";
  database: {
    reachable: boolean;
  };
  jobs: {
    activeCount: number;
    failedCount: number;
  };
  model: {
    chatFallbackConfigured: boolean;
    embeddingFallbackConfigured: boolean;
  };
  generatedAt: string;
};
```

新增 API wrapper：

```ts
getDocumentProcessingJobsGlobal(params)
retryDocumentProcessingJob(jobId)
cancelDocumentProcessingJob(jobId)
getSystemDiagnostics()
```

字段语义：

- `ACTIVE`：前端筛选项，对应后端 `QUEUED` + `RUNNING`。
- `CANCELED`：阶段 20 任务终态，表示用户或系统取消，不代表文档一定不可用。
- `SystemDiagnosticsResponse` 只展示安全摘要，不包含 Base URL、API Key、model、Authorization 或数据库连接信息。

## 已完成前端实现

1. `/Jobs` 页面
   - 新增任务中心页面，展示全局文档处理任务。
   - 支持筛选：全部、进行中、排队、运行、成功、失败、已取消。
   - 展示任务状态、进度、阶段、消息、错误、知识库/文档上下文和时间。
   - 活跃任务每 4 秒轮询，终态任务不做无意义高频刷新。

2. 任务操作
   - `FAILED` / `CANCELED` 任务显示重试入口。
   - `QUEUED` / `RUNNING` 任务显示取消入口。
   - 操作完成后刷新任务列表和诊断摘要。
   - 错误提示会二次脱敏，避免前端把后端异常细节原样展示给用户。

3. 系统诊断摘要
   - 展示数据库可达性。
   - 展示当前用户可见活跃任务数和失败任务数。
   - 展示 Chat/embedding 环境兜底配置是否存在。
   - 只展示安全布尔状态和计数，不展示具体密钥、地址、模型名或连接串。

4. 路由和导航
   - `src/main.tsx` 新增 `/Jobs` 路由。
   - `src/components/slider-sidebar.tsx` 新增侧边栏入口。
   - `src/components/slider-layout.tsx` 新增 Header 标题映射。

## UI 要求

- 继续使用 shadcn/radix-sera、Lucide、Tailwind 和现有 SaaS 工具风格。
- 任务中心是操作型后台页面，布局应紧凑、可扫描，不做营销式页面。
- 长文档名、长错误消息和长任务消息必须截断或换行，不能撑破页面。
- 权限不足时优先展示后端返回的脱敏错误，不在前端伪造权限判断。
- 系统诊断只做轻量摘要，不扩展成复杂管理员后台。

## 验证命令与结果

已运行：

```powershell
pnpm exec eslint src\api\documents.ts src\api\system.ts src\pages\Jobs.tsx src\main.tsx src\components\slider-sidebar.tsx src\components\slider-layout.tsx
pnpm build
```

结果：

- 目标 ESLint 已通过。
- `pnpm build` 已通过，仅保留既有 Vite chunk size warning。

后续如继续修改阶段 20 前端代码，至少重新运行上述构建和目标 ESLint。

## 手动验收路径

- `/Jobs`：检查任务列表、筛选、刷新、状态文案和诊断摘要。
- `/Jobs`：对失败或取消任务执行重试，确认旧任务仍保持终态，新任务进入新的处理流程。
- `/Jobs`：对排队或运行任务执行取消，确认任务进入 `CANCELED`，且后续不会变回成功或失败。
- `/Jobs`：以 `VIEWER` 身份确认可以查看可访问知识库任务，但不能重试或取消。
- `/Jobs`：确认诊断摘要不显示 Base URL、API Key、model、Authorization、数据库连接串或完整堆栈。
