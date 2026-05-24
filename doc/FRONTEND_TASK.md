# 前端任务书：阶段 11 文档处理增强收尾完成

本任务书是前端会话的固定入口。后续每个阶段都复用本文件，由文档会话实时更新当前任务。前端会话必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文件。

## 当前目标

阶段 11：文档处理增强已完成。

Documents 页面已同步阶段 11 新支持的文档格式，用户可以上传 DOCX 和 HTML，同时明确哪些格式仍不支持。

## 已完成内容

1. 保留现有 `.txt`、`.md`、`.markdown`、文本型 `.pdf` 支持。
2. 已把 `.docx`、`.html`、`.htm` 加入前端允许上传列表。
3. 更新上传 input 的 `accept` 字符串。
4. 更新上传区域提示文案，例如支持 TXT、Markdown、文本型 PDF、DOCX、HTML，单文件最大 10MB。
5. 更新文档类型识别和展示标签：
   - `.docx` 显示为 `Word` 或 `DOCX`
   - `.html` / `.htm` 显示为 `HTML`
6. 更新文件校验错误文案，明确不支持旧版 `.doc`、PPT、Excel、扫描版 PDF OCR。
7. 保持现有上传、loading、错误、空状态、删除流程和登录失效处理。
8. 不新增直接 `fetch`，不新增组件级 `localStorage`，不新增 mock-only 上传逻辑。

## 本阶段不做

- 不支持 `.doc`。
- 不支持 PPT / PPTX。
- 不支持 Excel / XLSX。
- 不做扫描版 PDF OCR。
- 不新增后台任务进度 UI。
- 不新增文档预览器。
- 不新增 RAG / Chat 功能。
- 不做大规模 UI 重构。

## 已涉及文件

- `src/components/documents/document-data.ts`
- `src/components/documents/document-utils.ts`
- `src/components/documents/document-upload-zone.tsx`
- `src/components/documents/document-types.ts`
- `src/pages/Documents.tsx`

## 接口边界

上传接口保持不变：

```http
POST /api/knowledge-bases/{knowledgeBaseId}/documents
```

前端继续使用现有 axios API wrapper：

```text
src/api/documents.ts
```

不要新增直接 `fetch`。如果后端没有新增响应字段，不要擅自扩展 API 类型。若后端实际行为与 `doc/API.md` 不一致，先反馈给文档会话同步。

## UI 要求

- 使用现有 shadcn/radix-sera、Lucide、Tailwind 风格。
- 参考 `$ui-ux-pro-max`，保持专业 SaaS/知识库工具审美。
- 不做营销式说明，不做嵌套卡片堆叠，不让长文案撑破上传区域。
- 除非用户明确要求 `@chrome`、`@浏览器`、Playwright 或截图验收，否则不要主动打开浏览器验收；默认只跑代码级验证，并把浏览器验收步骤交给用户。

## 验收结果

```powershell
pnpm build
pnpm eslint src/pages/Documents.tsx src/components/documents src/api/documents.ts
```

验收结果：两条命令均通过。`pnpm build` 仍有 Vite 主 chunk 超过 500KB 的体积 warning，不是构建失败。

## 下一阶段占位

下一阶段为阶段 12：权限与团队协作。进入阶段 12 前，文档会话需要重新改写本文件为阶段 12 前端任务书。
