# 前端任务书：阶段 23 Settings 联系方式与头像存储状态契约同步

本文档是前端 Agent 的固定入口。前端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 22 前端 Settings/Chat 验收修复已完成；阶段 23 正在同步 Settings 联系方式展示、头像上传可用性和 OSS 未配置提示。**

阶段 23 前端目标是让 Settings 账号资料和后端 Stage23 契约一致：展示并编辑联系方式 `phone`，读取 `avatarStorageConfigured` 决定是否允许上传本地头像，OSS 未配置时提示“头像上传需要先配置 OSS；当前可选择默认头像”。复杂阶段和多子系统任务推荐采用团队编排模式：主对话担任项目经理/协调者，负责审核、拆分、下发、集成和最终验证；前端实现或复核任务优先拆分到 Codex 后台 Thread/worktree 或 `AGENT_TEAM`，且下发 worker 的思考/推理等级默认使用可用最高级（例如 `xhigh` / 最高级）。

## API 接入

继续使用现有 axios wrapper：

- `src/api/auth.ts`
- `src/api/chat.ts`
- `src/api/documents.ts`

阶段 21 技术例外仍保留：

- `src/api/chat-stream.ts` 是唯一允许直接使用 `fetch` 的前端文件，用于浏览器读取 `POST + text/event-stream`。其他普通 API 不得新增直接 `fetch`。

新增/扩展类型字段：

```ts
type AvatarSource = "UPLOAD" | "PRESET" | "NONE";
type DefaultAvatarPresetId = "blue" | "green" | "coral" | "violet" | "mint" | "rose" | "amber" | "slate";

type UserResponse = {
  id: number;
  username: string;
  role: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  avatarConfigured: boolean;
  avatarStorageConfigured: boolean;
  avatarSource: AvatarSource;
  avatarPresetId: DefaultAvatarPresetId | null;
};
```

二次验收后端契约补充：

```ts
updateCurrentUserProfile(payload: {
  username?: string;
  email?: string | null;
  phone?: string | null;
})
```

`username`、`email` 和 `phone` 均为可选字段，但请求体至少包含一个字段；`email: null` 或空字符串表示清空邮箱，`phone: null` 或空字符串表示清空联系方式。响应仍为 `UserResponse`，不得把 OSS object key、签名 URL 持久化值、密钥或 Authorization 暴露到 toast、日志或 storage。

新增 API wrapper：

```ts
selectCurrentUserAvatarPreset(avatarPresetId: DefaultAvatarPresetId)
uploadCurrentUserAvatar(file)
deleteCurrentUserAvatar()
```

`deleteCurrentUserAvatar()` 仅保留兼容能力，Settings 普通用户入口不展示删除头像按钮。

## 已完成前端实现

1. Settings 资料与头像
   - 二次验收后，账号资料编辑恢复为可修改用户名、邮箱、联系方式和头像；角色、时区仍只读。
   - Settings 页面和编辑资料弹窗不再展示语言字段。
   - 新增“编辑资料”弹窗；弹窗中允许选择默认头像、选择本地头像文件、修改用户名、邮箱和联系方式。
   - 保存资料按钮移动到弹窗底部。
   - 删除“删除头像”用户入口；用户可通过选择默认头像或重新上传替换头像。
   - 新增 `src/components/user-avatar.tsx`，统一 `UserAvatar`、`AvatarPresetPicker` 和 8 个默认头像 preset。
   - Header、Sidebar、Settings 统一按 `avatarSource/avatarPresetId/avatarUrl` 渲染头像。
   - 阶段 23 增加 `avatarStorageConfigured` 判断：OSS 未配置时禁用本地头像上传，显示“头像上传需要先配置 OSS；当前可选择默认头像”，默认头像 preset 仍可保存。
   - Zustand auth store 运行时保留短期 `avatarUrl`，持久化时剔除 `avatarUrl`，避免把签名 URL 写入 storage。
   - 主布局挂载时通过 `/api/auth/me` 重新同步当前用户资料，刷新任意已登录页面后可重新获取上传头像短期签名 URL。

2. Chat mention 交互
   - mention 触发改为 CLI 风格：只有 `@` 位于文本开头或前一个字符为空白时才打开文档列表。
   - mention 列表不自动聚焦搜索框，焦点保留在 textarea。
   - `@` 后继续输入的 inline query 用于过滤文档。
   - 文档名高亮匹配 query。
   - `↑/↓` 切换选中项，`←/→` 分页，`Enter/Tab` 选择，`Esc` 关闭。
   - 删除 `@` 后关闭列表；移除 mention chip 时删除整段 `@文档名` token；手动删改 token 后同步清理对应文档 ID。

3. Chat 验收修复
   - 流式提示文案改为“正在思考”。
   - 修复 Chat 引用来源和会话列表 mojibake 文案。
   - 点击当前会话沟通区域时，如果会话未读，则用防抖调用 `PATCH /api/chat/sessions/{id}` 设置 `unread:false`；已读状态不重复请求。
   - Settings 弹窗、头像选择、Chat composer、mention picker、会话列表、引用来源卡片增加 `min-w-0`、换行/截断和小屏布局约束。

## UI 和交互要求

- Settings 资料卡只读，不静默新增 mock-only 保存。
- Settings 显示联系方式；联系方式可留空，只允许数字、普通空格、`+`、`-` 和英文括号。
- Settings 不展示“删除头像”按钮。
- 头像上传不把文件、签名 URL、OSS object key 或 OSS 配置写入 localStorage/sessionStorage。
- OSS 未配置时，前端不发起本地头像上传，并提示“头像上传需要先配置 OSS；当前可选择默认头像”。
- Chat mention 不抢焦点，不影响用户继续输入。
- 普通正文中的 `@` 不弹文档索引列表。
- API Key、Authorization、OSS 密钥、完整供应商错误不得出现在 toast、日志或错误详情中。
- 前端实现线程默认先完成代码级验证；当用户明确要求或协调者下发专门验收任务时，可以使用 `browser-use`、Browser、Chrome、Playwright、截图等浏览器工具做真实页面/UI 验收，并在回报中列出访问路径、操作步骤、观察结果、失败点和剩余人工验收项。

## 验证命令

阶段收尾运行：

```powershell
pnpm exec eslint src/pages/Settings.tsx src/api/auth.ts src/store/auth.ts src/components/settings src/components/chat src/components/chat-page src/components/slider-sidebar.tsx src/components/MainHeader.tsx
pnpm build
rg -n "fetch\(" src
rg -n "鏈|娣|鍏|璇|灞|鏀|�" src/components/chat-page src/components/chat src/pages/Chat.tsx
```

## 验证结果

- 目标 ESLint 已通过。
- `pnpm build` 已通过，仅保留既有 Vite 大 chunk 提示。
- `rg -n "fetch\(" src` 仅匹配 `src/api/chat-stream.ts` 的 POST SSE 例外。
- 指定 Chat/Settings 范围 mojibake 残留检查无匹配。
- `git diff --check` 已通过，仅有 Windows 下 LF 将转换为 CRLF 的提示。

## 手动验收路径

- `/Settings`：资料卡片只读并显示联系方式；点击“编辑资料”后弹窗可修改用户名、邮箱、联系方式，可选择默认头像或上传头像，保存后 Header/Sidebar/Settings 同步更新。
- `/Settings`：OSS 未配置时，本地头像上传入口禁用，并显示“头像上传需要先配置 OSS；当前可选择默认头像”。
- `/Settings`：不再出现“删除头像”按钮。
- `/Chat/{sessionId}`：发送消息时显示“正在思考”。
- `/Chat/{sessionId}`：普通正文中的 `@` 不弹索引；行首或空格后的 `@` 弹文档列表。
- mention 列表支持高亮、键盘选择、分页、删除 `@` 后关闭。
- 会话未读时点击沟通区域变已读，且不会连续重复 PATCH。
- 小屏下 Settings、Chat、mention 列表、引用来源不横向溢出、不互相遮挡。
