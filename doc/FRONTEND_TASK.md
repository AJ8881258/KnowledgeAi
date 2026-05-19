# 前端任务书：Chat 体验与会话管理

本任务书是前端会话的固定入口。后续每个阶段都复用本文件，由文档会话实时更新当前任务。前端可直接实现代码，但必须遵守 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本任务书。

## 当前目标

在阶段 6 RAG 问答基础功能已接入后，先做一轮 Chat 体验和会话管理增强：

1. 修复 `/Chat/{sessionId}` 切换对话时外层内容区明显刷新的割裂感，只让聊天消息区域进入加载/刷新状态。
2. `/KnowledgeBases/{id}` 页面删除 RAG 对话入口，只保留文档检索测试区。
3. 给 Chat 会话增加编辑能力：删除、重命名、置顶/取消置顶。

本轮不做流式输出、不做 embedding、不做 pgvector、不做新的 mock-only 主流程。

## 开发规则

- 使用 `src/api/http.ts` 的 axios 实例。
- Chat 相关请求统一放在 `src/api/chat.ts`，请求/响应类型和 API wrapper 放在一起。
- 不使用直接 `fetch`。
- 不在组件里直接访问 `localStorage`。
- 需要跨页面共享或持久化的状态才使用 Zustand；纯 UI 状态用组件内 `useState`。
- UI 使用 shadcn/radix-sera 组件、Lucide 图标和现有 Tailwind 风格。
- 参考 `$ui-ux-pro-max`：专业 SaaS/知识库工具风格，避免营销式页面、嵌套卡片、文字溢出、过度装饰、hover 布局位移。

## API 封装要求

在现有 `src/api/chat.ts` 基础上补充类型和函数。

`ChatSessionResponse` 增加：

```ts
pinned: boolean;
```

新增请求类型：

```ts
export type UpdateChatSessionRequest = {
  title?: string;
  pinned?: boolean;
};
```

新增 API wrapper：

```ts
export async function updateChatSession(
  sessionId: number | string,
  request: UpdateChatSessionRequest,
)

export async function deleteChatSession(sessionId: number | string)
```

继续保留已有函数：

- `createKnowledgeBaseChatSession(knowledgeBaseId, request)`
- `getKnowledgeBaseChatSessions(knowledgeBaseId)`
- `getChatSessionMessages(sessionId)`
- `sendChatSessionMessage(sessionId, request)`

## 任务 1：修复 `/Chat/{sessionId}` 切换割裂感

当前问题：选择不同对话时，外层内容区出现明显刷新，体验像整块页面重载。目标是让切换会话时只刷新聊天消息区域。

实现要求：

- 切换会话时不要重新加载知识库列表。
- 切换会话时不要重新加载整个会话列表，除非用户主动刷新或执行删除/重命名/置顶后需要同步。
- `RagChatWorkspace` 内部应保留左侧会话列表、页面外壳、输入框和布局尺寸稳定。
- 只有消息列表区域显示 loading/skeleton。
- URL 可以继续同步为 `/Chat/{sessionId}`，但 URL 改变不能触发整页重新拉取。
- 如果当前选中的 `sessionId` 和目标相同，不发请求、不 navigate。
- 如果 `/Chat/{sessionId}` 中的会话不存在或不属于当前用户，显示明确空/错误状态，并允许用户返回 `/Chat` 或新建会话。

建议方向：

- 把“首次从 URL 读取 sessionId”和“用户点击切换 session”分开处理。
- `initialSessionId` 只用于初始化选中会话，不要让它在每次 URL 变化时触发 `loadSessions()`。
- `handleOpenSession(sessionId)` 只执行：
  - 更新当前激活会话。
  - 加载该会话消息。
  - 轻量同步 URL。
- 避免因为 `navigate('/Chat/{id}')` 导致 `RagChatWorkspace` 重新加载 sessions。

## 任务 2：知识库详情页只保留检索测试

`/KnowledgeBases/{id}` 页面不再放 RAG 对话功能，只保留阶段 5 的检索测试区。

实现要求：

- 删除知识库详情页里的 RAG 对话 Tab 或 RAG 对话面板。
- 保留 `KnowledgeBaseSearchPanel`。
- 保留文档处理状态、已索引文档、可检索 chunks、检索范围说明。
- 页面文案应聚焦“文档检索测试”，不要暗示这里可以直接聊天。
- 不删除 `/Chat` 页面。正式问答入口仍放在 `/Chat`。
- 移除不再使用的 `RagChatWorkspace` import 和相关 props，避免死代码。

## 任务 3：会话编辑能力

给 `/Chat` 的会话列表增加操作入口。建议在每个会话项右侧放 `MoreHorizontal` 菜单，使用 shadcn/radix-sera dropdown 或项目已有菜单组件。

需要支持：

- 重命名：
  - 打开轻量 dialog 或 inline edit。
  - 输入为空时不提交。
  - 成功后更新当前会话列表和标题。
- 删除：
  - 必须有确认提示。
  - 删除当前激活会话后，自动选中下一个可用会话。
  - 如果没有剩余会话，进入空会话状态，用户首次提问时自动创建会话。
  - 删除非当前会话时，不影响当前消息区。
- 置顶/取消置顶：
  - 置顶会话显示在列表顶部。
  - 已置顶会话要有低噪声标识，例如 Pin 图标或“置顶”标签。
  - 取消置顶后按更新时间回到普通排序。

排序规则：

```text
pinned desc -> updatedAt desc -> id desc
```

状态要求：

- 操作中按钮 disabled，避免重复提交。
- 失败时保留原状态并 toast 提示。
- 401 继续沿用现有跳转登录逻辑。
- 404 表示会话不存在或无权限，前端应从列表移除该会话并提示。

## UI 质量要求

- 不做 landing page。
- 不做营销式大 hero。
- 不把聊天主界面做成多层嵌套卡片。
- 聊天内容、引用来源、菜单、按钮文字在移动端和桌面端都不能溢出。
- 会话列表项高度稳定，hover、active、置顶、菜单打开时不能造成布局跳动。
- 点击区域要有 `cursor-pointer` 和稳定 hover 状态。
- 图标使用 Lucide，不用 emoji 当 UI 图标。
- 颜色和间距沿用当前项目，不新增突兀主题。

## 验收标准

- `pnpm build` 通过。
- 目标文件 ESLint 通过。
- `/Chat/{sessionId}` 切换会话时，只有消息区域显示加载状态，外层内容区不整块刷新。
- `/KnowledgeBases/{id}` 只保留检索测试，不再出现 RAG 对话区域。
- 会话可以重命名、删除、置顶、取消置顶。
- 删除当前会话后，页面能进入下一个会话或空状态，不报错。
- 置顶排序在刷新后仍保持。
- 新增请求都走 `src/api/chat.ts` 的 axios wrapper。
- 不新增直接 `fetch` 和组件级 `localStorage`。
