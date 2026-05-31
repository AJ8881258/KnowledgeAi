# 前端任务书：阶段 18 语义检索与混合召回展示

本文档是前端 Agent 的固定入口。前端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 18 前端已完成，并已通过构建和目标 ESLint。**

阶段 18 前端不做大规模 UI 重构，不恢复知识库详情页 Chat 入口，不新增 mock-only 逻辑。重点是接入后端新增的 embedding 状态、混合检索分数拆解和召回模式，让用户能判断当前结果来自全文、语义还是混合召回。

## API 接入

继续使用现有 axios wrapper：

- `src/api/documents.ts`
- `src/api/chat.ts`

不新增直接 `fetch`，不新增组件级 `localStorage`，不新增 mock-only 检索或 Chat 逻辑。

新增/扩展类型字段：

```ts
type DocumentResponse = {
  embeddingStatus?: string | null;
  embeddingErrorMessage?: string | null;
  embeddingUpdatedAt?: string | null;
};

type SearchResultResponse = {
  score?: number;
  hybridScore?: number;
  fulltextScore?: number;
  semanticScore?: number;
  retrievalMode?: string;
};

type ChatSourceResponse = {
  score?: number;
  hybridScore?: number;
  fulltextScore?: number;
  semanticScore?: number;
  retrievalMode?: string;
};
```

字段语义：

- `retrievalMode = HYBRID`：后端使用全文分和语义分组合排序。
- `retrievalMode = FULLTEXT`：后端未使用语义向量，或语义检索失败后降级全文检索。
- `hybridScore`：混合排序分。
- `fulltextScore`：PostgreSQL 全文检索分。
- `semanticScore`：query embedding 与 chunk embedding 的语义相似度分。
- `score`：兼容字段，优先等同于 `hybridScore`，全文降级时等同于 `fulltextScore`。

## 已完成前端实现

1. Documents 页面
   - `DocumentTable` 展示文档 embedding 状态。
   - `DocumentDetails` 展示 embedding 状态和失败原因。
   - `embeddingStatus` 映射为用户可读中文短标签，不直接暴露内部状态解释为错误。

2. 知识库详情检索区
   - `knowledge-base-search-panel.tsx` 展示召回模式。
   - 检索结果展示混合分、全文分、语义分。
   - 长内容仍保持合理折叠/截断，不撑破布局。

3. 知识库详情文档区
   - `knowledge-base-detail-view.tsx` 在文档列表和详情信息里展示 embedding 状态。
   - 保持 `/KnowledgeBases/{id}` 只作为检索测试和文档查看入口，不恢复 Chat 入口。

4. Chat 引用来源
   - `rag-chat-workspace.tsx` 的右侧 sources 面板展示召回模式和分数拆解。
   - 消息内引用来源摘要同样展示混合分、全文分、语义分。
   - 空 `sources` 仍是轻提示，不当作错误。

## UI 要求

- 继续使用 shadcn/radix-sera、Lucide、Tailwind 和现有 SaaS 工具风格。
- 分数展示要克制，只作为解释信息，不压过回答正文。
- `HYBRID`、`FULLTEXT` 标签必须可读，但不把 `FULLTEXT` 降级渲染成失败状态。
- 长文档名、长 chunk 内容和长分数字段不能撑破卡片或消息布局。

## 验证命令与结果

已运行：

```powershell
pnpm build
pnpm exec eslint src/api/documents.ts src/api/chat.ts src/components/knowledge-bases/knowledge-base-search-panel.tsx src/components/knowledge-bases/knowledge-base-detail-view.tsx src/components/chat-page/rag-chat-workspace.tsx src/components/documents/document-table.tsx src/components/documents/document-details.tsx
```

结果：

- `pnpm build` 已通过。
- 目标 ESLint 已通过。

后续如继续修改阶段 18 前端代码，至少重新运行上述构建和目标 ESLint。

## 手动验收路径

- `/Documents`：查看文档列表 embedding 状态。
- `/Documents/{knowledgeBaseId}`：查看文档详情 embedding 状态和处理任务状态。
- `/KnowledgeBases/{id}`：执行检索，确认结果显示召回模式、混合分、全文分、语义分。
- `/Chat/{sessionId}`：发送问题后查看右侧引用来源，确认 sources 展示召回模式和分数拆解；空 sources 显示轻提示。

如果没有配置 `KNOWFLOW_AI_EMBEDDING_MODEL` 或用户模型配置不可用，应验收为 `FULLTEXT` 降级，而不是前端错误。
