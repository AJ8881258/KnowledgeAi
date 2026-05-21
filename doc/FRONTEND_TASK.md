# 前端任务书：阶段 10 RAG 体验增强

本任务书是前端会话的固定入口。后续每个阶段都复用本文件，由文档会话实时更新当前任务。前端可直接实现代码，但必须遵守 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本任务书。

## 当前目标

下一阶段进入阶段 10：RAG 体验增强。

目标是在阶段 9 PostgreSQL 全文检索稳定后，增强 Chat 问答体验：发送中状态、空检索降级、模型失败提示、引用来源展示、多轮上下文说明。流式输出作为可选增量，除非 `doc/API.md` 已补充并确认 SSE 契约，否则不要主动实现流式 UI。

本阶段默认不做：

- 大规模 UI 重构
- 新知识库详情页聊天入口
- 直接 `fetch`
- 组件级 `localStorage`
- mock-only Chat 逻辑
- 主动浏览器/截图验收
- embedding 或 pgvector 相关 UI

## 接口边界

默认继续使用已实现的非流式 Chat 接口：

```text
src/api/chat.ts
POST /api/chat/sessions/{sessionId}/messages
```

消息和引用来源结构继续与 `doc/API.md` 保持一致：

```ts
type ChatMessageSource = {
  documentId: number;
  documentName: string;
  chunkId: number;
  chunkIndex: number;
  content: string;
  score: number;
};
```

如果后端没有新增字段，不要擅自扩展 API 类型。若后端新增字段，先提醒文档会话同步 `doc/API.md`。

## 当前任务

### 任务 1：发送中和失败状态

- 检查 `src/components/chat-page/` 下当前 Chat 工作区组件。
- 用户发送问题后，输入框和发送按钮要有清晰的发送中状态，避免重复提交。
- 模型调用失败时展示明确错误提示，不要只显示泛化的“服务不可用”。
- 401 时沿用当前登录失效处理：清理登录状态并跳转 `/login`。
- 不改变现有 Chat API 调用方式，除非后端任务明确新增接口。

### 任务 2：空检索降级展示

- 当后端返回助手消息但 `sources` 为空时，前端要把它当成“没有足够引用来源”的正常状态展示。
- 不要把空 `sources` 误判成接口失败。
- 引导文案应克制，例如提示“当前回答没有可展示的引用来源”。
- 不要在前端伪造引用来源。

### 任务 3：引用来源体验

- 引用来源继续展示文档名、chunk 序号、相关度和片段内容。
- 片段内容较长时使用展开/折叠或合理截断，避免撑破消息布局。
- 引用来源视觉上应服务于阅读，不要做成嵌套卡片堆叠。
- 保持专业 SaaS/知识库工具风格，参考 `$ui-ux-pro-max` 的 UI 检查项。

### 任务 4：多轮上下文说明

- 如果后端实现了多轮上下文，前端不需要新增复杂配置面板。
- 可以在 Chat 页面用轻量状态或提示说明“会结合当前会话上下文回答”。
- 不要新增本地可编辑的 RAG 参数；RAG 参数仍由 `/Settings` 后端配置承担。

### 任务 5：可选流式输出

- 阶段 10 默认先不主动实现流式 UI。
- 如果用户明确要求流式输出，并且 `doc/API.md` 已补充 SSE 契约，再新增 stream API wrapper 和流式消息状态。
- 流式过程中要覆盖：连接中、增量内容、完成、失败、取消或页面离开清理。

## 开发规则

- 先读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文件。
- 使用现有 axios API wrapper，不新增直接 `fetch`。
- 不在组件里直接访问 `localStorage`。
- UI 使用 shadcn/radix-sera 组件、Lucide 图标和现有 Tailwind 风格。
- 如涉及 UI 修改，参考 `$ui-ux-pro-max`：专业 SaaS/知识库工具风格，避免营销式页面、嵌套卡片、文字溢出、过度装饰、hover 布局位移。
- 除非用户明确要求使用 `@chrome`、`@浏览器`、Playwright、截图或其他浏览器工具做验收，否则不要主动打开浏览器做 UI/视觉验收；默认只跑 `pnpm build`、目标 ESLint、类型检查等代码级验证，并把浏览器验收步骤交给用户。

## 验收标准

- `pnpm build` 通过。
- 目标文件 ESLint 通过，至少覆盖 `src/components/chat-page/`、`src/api/chat.ts`，如涉及 Settings 或公共组件则补充对应路径。
- 发送问题时不会重复提交，发送中状态清晰。
- 空引用来源不是错误状态，前端不会伪造 sources。
- 引用来源长文本不会撑破布局。
- 没有新增直接 `fetch`。
- 没有新增组件级 `localStorage`。
- 没有新增 mock-only Chat 逻辑。
- 未经用户明确要求，不主动使用浏览器工具验收。
