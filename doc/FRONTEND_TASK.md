# 前端任务书：阶段 15 知识库质量与文档处理增强

本文档是前端 Agent 的固定入口。前端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 15 规划中，待实现。**

阶段 15 聚焦文档处理质量和 RAG 可信度：用户需要能在 Documents 和知识库详情中看懂文档处理结果、失败原因、chunk 质量、重新处理入口和文档摘要。不要在本阶段做 SSE、向量检索 UI、OCR/PPT/Excel UI、复杂后台任务中心或恢复知识库详情页 Chat 入口。

## 前端目标

- 文档列表和详情展示处理质量。
- 为 `OWNER` / `EDITOR` 提供重新处理和失败重试入口。
- 为成员提供文档摘要展示和生成入口。
- 检索测试区和 Chat 引用来源继续清楚展示真实 chunk 来源。
- 保持专业 SaaS/知识库工具审美，不做营销式页面或嵌套卡片堆叠。

## API 接入

新增或调整 API wrapper 必须放在 `src/api/`，继续使用 axios `http` 客户端，不新增直接 `fetch`。

计划接口以 `doc/API.md` 为准：

- `POST /api/documents/{documentId}/reprocess`
- `GET /api/documents/{documentId}/quality`
- `POST /api/documents/{documentId}/summary`

需要补充或更新的类型建议：

- `DocumentResponse` 增加可选质量字段：`charCount`、`averageChunkLength`、`qualityWarnings`、`summary`。
- 新增 `DocumentQualityResponse`。
- 新增 `DocumentSummaryResponse`。

## 实现要求

1. 文档列表
   - 展示文档状态、chunk 数和质量提示入口。
   - `FAILED` 文档突出失败原因，但不要让长错误撑破表格。
   - `OWNER` / `EDITOR` 可看到“重试/重新处理”操作；`VIEWER` 不显示或禁用该操作。

2. 文档详情
   - 展示 chunk 数、字符数、平均 chunk 长度、质量提示、摘要。
   - 质量提示应轻量、可扫描，不要用大段说明文字。
   - chunk 列表继续可读，长文本必须折叠、截断或限制宽度。

3. 重新处理和失败重试
   - 点击前应有明确确认，说明会重新解析并替换当前 chunks。
   - 请求中展示 loading 状态，避免重复提交。
   - 成功后刷新文档详情、文档列表和 chunk 列表。
   - 403 显示“当前角色无权执行此操作”；404 显示“不存在或无权访问”。

4. 文档摘要
   - 提供生成摘要按钮。
   - 生成中显示状态，成功后展示摘要。
   - 摘要失败时显示后端脱敏错误。
   - 摘要文案不得暗示它是引用来源；Chat 引用仍来自 chunks。

5. UI 约束
   - 使用现有 shadcn/radix-sera、Lucide、Tailwind 风格。
   - 参考 `$ui-ux-pro-max`，保持专业、紧凑、可扫描。
   - 不新增组件级 `localStorage`。
   - 不新增 mock-only 文档质量或摘要数据。
   - `/KnowledgeBases/{id}` 继续只保留检索测试区，不恢复 RAG 对话入口。

## 验证命令

```powershell
pnpm build
pnpm eslint src/pages/Documents.tsx src/pages/KnowledgeBases.tsx src/api/documents.ts src/components/documents src/components/knowledge-bases
```

如果全量 `pnpm lint` 仍有历史问题，只说明哪些不是本次修改范围。

## 手动验收路径

- `/Documents`：查看文档状态、质量提示、失败重试入口。
- `/Documents/{knowledgeBaseId}`：按知识库过滤后检查相同能力。
- 文档详情面板：查看 chunk 数、字符数、质量警告、摘要和 chunk 列表。
- `/KnowledgeBases/{id}`：检索测试区仍显示真实 chunk 命中，不恢复 Chat 入口。
- 使用 `OWNER`、`EDITOR`、`VIEWER` 角色分别检查重新处理按钮可见性和错误提示。
