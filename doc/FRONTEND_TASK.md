# 前端任务书：阶段 19 语义索引运维与检索策略可控

本文档是前端 Agent 的固定入口。前端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 19 前端已完成，并已通过构建和目标 ESLint。**

阶段 19 前端不做大规模 UI 重构，不恢复知识库详情页 Chat 入口，不新增 mock-only 逻辑。重点是接入后端新增的 RAG 检索策略、混合权重和语义索引重建接口，让用户能控制检索模式并手动刷新语义向量。

## API 接入

继续使用现有 axios wrapper：

- `src/api/settings.ts`
- `src/api/documents.ts`

不新增直接 `fetch`，不新增组件级 `localStorage`，不新增 mock-only 检索或 Chat 逻辑。

新增/扩展类型字段：

```ts
type RagRetrievalMode = "HYBRID" | "FULLTEXT";

type RagSettingsResponse = {
  topK: number;
  maxContextChunks: number;
  temperature: number;
  retrievalMode: RagRetrievalMode;
  semanticWeight: number;
  fulltextWeight: number;
};

type DocumentProcessingJobType =
  | "UPLOAD_INDEX"
  | "REPROCESS"
  | "REBUILD_SEMANTIC_INDEX";
```

新增 API wrapper：

```ts
rebuildDocumentSemanticIndex(documentId: number)
rebuildKnowledgeBaseSemanticIndex(knowledgeBaseId: number)
```

字段语义：

- `retrievalMode = HYBRID`：后端使用语义向量和全文检索组合排序。
- `retrievalMode = FULLTEXT`：后端跳过 embedding 查询，只使用全文检索。
- `semanticWeight`：混合排序中语义分权重。
- `fulltextWeight`：混合排序中全文分权重，前端按 `1 - semanticWeight` 派生并提交。
- `REBUILD_SEMANTIC_INDEX`：语义索引重建任务，不代表文档重新解析。

## 已完成前端实现

1. Settings RAG 参数
   - `RagSettingsSection` 新增检索策略选择。
   - 新增语义权重滑块，全文权重自动派生。
   - `FULLTEXT` 模式禁用语义权重输入，避免用户误以为仍会调用 embedding。
   - 保存时通过 `PATCH /api/settings/rag` 写入后端，未使用本地假保存。

2. Documents 页面
   - `DocumentTable` 增加文档级“重建语义索引”入口。
   - 只有具备文档变更权限且文档 `INDEXED`、`chunkCount > 0` 时可执行。
   - 活跃任务期间禁用重复重建。

3. 文档详情
   - `DocumentDetails` 增加重建语义索引操作区。
   - 文案明确“只重建向量索引，不重新解析文档，也不会替换当前 chunks”。

4. 知识库详情
   - `KnowledgeBaseDetailView` 增加知识库级语义索引运维入口。
   - `OWNER` / `EDITOR` 可为当前知识库中可重建文档批量创建任务。
   - `/KnowledgeBases/{id}` 继续只作为检索测试和文档查看入口，不恢复 Chat 入口。

## UI 要求

- 继续使用 shadcn/radix-sera、Lucide、Tailwind 和现有 SaaS 工具风格。
- RAG 策略和权重是专业设置项，展示要克制，不做营销式解释。
- 语义索引重建入口不能误导为“重新处理文档”；必须说明不替换 chunks。
- 长文档名、长任务提示和权重字段不能撑破卡片或表格。
- 权限不足的操作优先隐藏；如果保留按钮，必须禁用并给出清晰原因。

## 验证命令与结果

已运行：

```powershell
pnpm build
pnpm exec eslint src/api/documents.ts src/api/settings.ts src/api/chat.ts src/pages/Documents.tsx src/pages/Settings.tsx src/components/documents/document-table.tsx src/components/documents/document-details.tsx src/components/knowledge-bases/knowledge-base-detail-view.tsx src/components/knowledge-bases/knowledge-base-search-panel.tsx src/components/settings/settings-rag.ts src/components/settings/rag-settings-section.tsx src/components/settings/settings-components.tsx
```

结果：

- `pnpm build` 已通过。
- 目标 ESLint 已通过。

后续如继续修改阶段 19 前端代码，至少重新运行上述构建和目标 ESLint。

## 手动验收路径

- `/Settings`：切换 RAG 检索策略，调整语义权重并保存，刷新后确认设置保留。
- `/Documents`：对已 `INDEXED` 且有 chunks 的文档创建语义索引重建任务。
- `/Documents/{knowledgeBaseId}`：在文档详情中触发单文档语义索引重建。
- `/KnowledgeBases/{id}`：在详情页触发知识库级语义索引重建；VIEWER 不应看到可执行入口。
- `/KnowledgeBases/{id}`：切换 `FULLTEXT` 后执行检索，确认仍能得到全文检索结果且不被当作错误。
