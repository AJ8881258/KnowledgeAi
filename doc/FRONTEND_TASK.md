# 前端任务书：阶段 17 后台任务化与文档处理进度

本文档是前端 Agent 的固定入口。前端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 17 前端已完成，并已通过构建、目标 ESLint 和 browser-use 端到端验收。**

阶段 17 前端聚焦 Documents 页面：接入后端持久化文档处理任务，让上传和重新处理能展示后台进度、失败原因和任务历史。阶段 17 不做大规模 UI 重构，不恢复知识库详情页 Chat 入口，不新增 mock-only 逻辑。

## API 接入

继续使用 `src/api/documents.ts` axios wrapper，不新增直接 `fetch`，不新增组件级 `localStorage`。

新增类型：

```ts
type DocumentProcessingJobType = "UPLOAD_INDEX" | "REPROCESS";

type DocumentProcessingJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

type DocumentProcessingJobResponse = {
  id: number;
  documentId: number;
  knowledgeBaseId: number;
  requestedBy: number;
  jobType: DocumentProcessingJobType;
  status: DocumentProcessingJobStatus;
  progressPercent: number;
  stage: string | null;
  message: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

新增 API wrapper：

- `getKnowledgeBaseDocumentProcessingJobs(knowledgeBaseId, limit)`
- `getDocumentProcessingJobs(documentId, limit)`
- `getDocumentProcessingJob(jobId)`

## 已完成实现

1. 文档任务状态
   - `Documents.tsx` 维护 `processingJobs`。
   - 进入知识库时加载最近处理任务。
   - 对 `QUEUED` / `RUNNING` 任务每 2 秒轮询单个 job。
   - 任务全部进入终态后刷新文档列表。

2. 文档列表
   - `DocumentTable` 接收 `activeJobsByDocumentId`。
   - 有活跃任务时状态显示“后台处理中”、spinner、进度条和阶段。
   - 活跃任务期间禁用重新处理按钮，避免重复创建任务。

3. 文档详情
   - `DocumentDetails` 接收当前文档最近一次 `processingJob`。
   - 显示“后台处理任务”区，包括任务类型、状态、进度、阶段、消息、错误、创建时间和更新时间。
   - 活跃任务期间详情里的重新处理按钮禁用。

4. 上传和重新处理
   - 上传成功后同时刷新文档列表和任务列表。
   - 重新处理成功后同时刷新文档列表和任务列表。
   - toast 文案改为后台任务语义，不再暗示请求返回就已经最终处理完成。

5. 权限和错误
   - `OWNER` / `EDITOR` 保留上传、删除、重新处理能力。
   - `VIEWER` 继续只读，无法上传、删除或重新处理。
   - 401 继续按登录失效处理。
   - 空任务列表或任务查询失败不阻塞文档主列表展示。

## 验证命令

```powershell
pnpm build
pnpm eslint src/pages/Documents.tsx src/api/documents.ts src/components/documents
```

## 手动验收路径

- `/Documents`：选择知识库后查看文档列表。
- `/Documents/{knowledgeBaseId}`：上传文档后应能看到处理状态变化。
- 文档列表：处理中的文档显示进度并禁用重新处理按钮。
- 文档详情：显示最近一次后台处理任务，失败时展示脱敏错误。
- 点击重新处理：确认弹窗后创建任务，完成后列表和详情刷新。

最终 browser-use 验收已覆盖 `/Documents` 登录、TXT 上传、后台处理任务展示、重新处理任务创建和 chunks 预览。前端 Agent 后续仍不主动启动浏览器，除非用户明确要求 browser-use、Chrome 或 Playwright 验收。
