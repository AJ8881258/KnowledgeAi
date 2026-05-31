# 前端任务书：阶段 21 Chat SSE 流式输出、头像上传与 @ 文件上下文

本文档是前端 Agent 的固定入口。前端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 21 前端已完成，并已通过构建和目标 ESLint。**

阶段 21 前端目标是让 Chat 默认使用 SSE 流式问答，支持 `@` 当前知识库文档上下文，同时在 Settings 增加头像上传/删除，并在 Header/Sidebar 中回显头像。

## API 接入

继续使用现有 axios wrapper：

- `src/api/auth.ts`
- `src/api/chat.ts`
- `src/api/documents.ts`

阶段 21 技术例外：

- `src/api/chat-stream.ts` 是唯一允许直接使用 `fetch` 的前端文件，用于浏览器读取 `POST + text/event-stream`。其他普通 API 不得新增直接 `fetch`。

新增/扩展类型字段：

```ts
type UserResponse = {
  id: number;
  username: string;
  role: string;
  email: string | null;
  avatarUrl: string | null;
  avatarConfigured: boolean;
};

type SendChatMessageRequest = {
  content: string;
  limit?: number;
  model?: string;
  ragEnabled?: boolean;
  mentionedDocumentIds?: number[];
};
```

新增 API wrapper：

```ts
uploadCurrentUserAvatar(file)
deleteCurrentUserAvatar()
streamChatSessionMessage(sessionId, request, options)
```

## 已完成前端实现

1. Chat SSE 流式输出
   - 新增 `src/api/chat-stream.ts`，读取 `session`、`user_message`、`assistant_message`、`delta`、`sources`、`done`、`error` 事件。
   - `src/components/chat-page/rag-chat-workspace.tsx` 默认使用流式接口发送消息。
   - 发送后立即展示用户消息；收到 `assistant_message` 后创建助手消息；收到 `delta` 后持续更新同一条助手消息内容。
   - 收到 `sources` 后更新右侧引用来源面板；收到 `done` 后刷新会话状态和今日统计。
   - 打断时 abort 当前 fetch 流，并调用后端 cancel API。

2. `@` 文件上下文
   - `src/components/chat/ChatComposer.tsx` 监听输入中的 `@`。
   - 弹出当前知识库已索引文档列表，顶部提供搜索。
   - 选择文档后插入 `@文件名` 并添加可移除 mention chip。
   - 发送请求时把 chip 对应的 `mentionedDocumentIds` 传给后端。
   - 列表仅展示当前知识库内 `INDEXED` 文档，避免选择后端不可检索的文档。

3. 头像上传
   - `src/api/auth.ts` 增加头像上传/删除 wrapper。
   - `src/store/auth.ts` 同步保存 `avatarUrl`、`avatarConfigured`。
   - Settings 账号资料区新增头像上传/删除控件，前端校验 JPEG/PNG/WebP 和 2MB 上限。
   - Header 和 Sidebar 使用 `avatarUrl` 展示头像，缺失时回退到用户名首字母。

## UI 和交互要求

- Chat 流式输出期间保持原三栏结构稳定，不刷新整个右侧区域。
- 打断后保留已生成部分，不再追加旧流后续内容。
- 无引用来源时只显示轻提示“当前回答没有可展示的引用来源”，不把空 sources 当错误。
- `@` 文档列表和长文件名必须截断或换行，不能撑破输入区。
- 头像上传不把文件、签名 URL、OSS object key 或 OSS 配置写入 localStorage。
- API Key、Authorization、OSS 密钥、完整供应商错误不得出现在 toast、日志或错误详情中。

## 验证命令

阶段收尾已运行：

```powershell
pnpm build
pnpm exec eslint src/pages/Chat.tsx src/pages/Settings.tsx src/api/chat.ts src/api/chat-stream.ts src/api/auth.ts src/components/chat src/components/chat-page src/components/settings src/components/slider-sidebar.tsx src/components/MainHeader.tsx
```

结果：

- `pnpm build` 已通过，仅保留既有 Vite 大 chunk warning。
- 目标 ESLint 已通过。

## 手动验收路径

- `/Chat/{sessionId}`：发送问题时助手回答逐步出现，不需要等完整回答。
- `/Chat/{sessionId}`：生成中点击“打断”，已生成部分保留，后续 token 不再追加。
- `/Chat/{sessionId}`：输入 `@` 弹出当前知识库文件列表，搜索文件名后可选择并生成 mention chip。
- `/Chat/{sessionId}`：选择 `@` 文档后发送，回答应围绕指定文档；没有引用时只显示轻提示。
- `/Chat/{sessionId}`：不使用 `@`，直接问包含文件标题的问题，也应由后端标题感知匹配对应文档。
- `/Settings`：上传头像后 Avatar 更新；刷新页面后通过签名 URL 继续显示；删除头像后恢复 fallback。
