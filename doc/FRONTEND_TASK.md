# 前端任务书：阶段 14 do.md 修复与部署收尾

本任务书是前端 Agent 的固定入口。后续每个阶段都复用本文件，由协调者实时更新当前任务。前端 Agent 必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文件。

当前协作方式：前端实现由协调者创建和管理的 `AGENT_TEAM` 执行，不再默认要求用户把本任务书复制到新的前端会话。前端 Agent 仍必须遵守本文件和 `AGENTS.md`。

## 当前目标

阶段 14：部署与运维 + `do.md` 修复。

先修复影响真实使用和演示稳定性的前端问题：Chat 模型选择、Settings 模型测试、退出确认、引用来源展示、未读角标和响应式体验。部署与运维说明仍是阶段 14 后续收尾重点。

## 本轮任务

1. Chat 输入区支持模型选择：
   - 模型列表来自 Settings 已保存的 Base URL/API Key。
   - 发送消息时通过 `src/api/chat.ts` 传可选 `model` 字段。
   - 切换模型后同步当前用户 Settings；同步失败时不阻断本次发送，但要展示脱敏错误。
2. Chat 消息体验：
   - 进入或切换会话时自动滚动到消息列表底部。
   - 发送、轮询和后台生成完成时只更新内部消息列表，不刷新整个右侧内容区。
   - `sources: []` 不是错误，只显示无引用来源轻提示。
3. 引用来源面板：
   - 右侧来源面板跟随当前选中的助手回答展示。
   - 展示文档名、chunk 序号、相关度和片段内容。
   - 空来源时显示轻提示，不暗示必须先索引 chunks 才能普通对话。
4. Settings 模型配置：
   - 将 “Chat Model” 和“手动模型名称”合并为一个既可选择又可手动输入的控件。
   - 接入 `POST /api/settings/model/test`，提供真实模型测试按钮。
   - 删除“保存成功只表示配置已写入后端，不代表模型调用一定可用...”等冗余说明。
   - API Key 不明文回显，不写入组件级 `localStorage`。
5. Settings 退出登录：
   - 点击退出登录先弹出确认框，确认后再清理登录状态并跳转 `/login`。
6. Header 和侧边栏：
   - 邮箱 icon 角标只按未读会话数统计，即 `unread === true`。
   - 失败/成功状态不影响未读统计。
   - 今日交谈次数继续来自后端统计接口，不使用组件级 `localStorage`。
7. 响应式：
   - 优先修复 Settings、Chat、Header、Sidebar 在移动端和窄屏下的溢出、错位和过高问题。
   - 不做营销式重构，不堆叠嵌套卡片。

## 约束

- 不新增直接 `fetch`，所有请求走 `src/api/` axios wrapper。
- 不新增 mock-only Chat、Settings 或模型数据。
- 不新增组件级 `localStorage`。
- 不主动使用 Chrome、Browser、Playwright、截图或浏览器验收工具，除非用户明确要求。
- 保持 shadcn/radix-sera、Lucide、Tailwind 和现有专业 SaaS 工具风格。

## 验收命令

```powershell
pnpm build
pnpm eslint src/pages/Settings.tsx src/pages/Chat.tsx src/api/settings.ts src/api/chat.ts src/components/settings src/components/chat-page src/components/chat/ChatComposer.tsx src/components/MainHeader.tsx src/components/slider-sidebar.tsx
```

如果全量 `pnpm lint` 仍有历史问题，只说明哪些不是本次修改范围。

## 手动验收说明

完成后给用户一份简短可执行步骤：

1. `/Settings`：获取模型列表、选择或手动输入模型、测试模型、保存模型配置。
2. `/Settings`：退出登录会先弹出确认框。
3. `/Chat/{sessionId}`：输入区可选择模型，发送“你好”能进入生成流程并展示助手回答或脱敏失败原因。
4. `/Chat/{sessionId}`：切换会话时自动滚到底部，右侧引用来源跟随选中的助手回答。
5. Header 邮箱角标只显示未读会话数量，失败会话是否计入只由 `unread` 决定。

## 完成后输出

完成后请输出：

1. 修改了哪些文件。
2. Chat 模型选择、发送和引用来源如何工作。
3. Settings 模型测试、模型输入和退出确认如何工作。
4. 是否修改 API 类型或 wrapper。
5. 运行了哪些校验命令和结果。
6. 还需要用户手动验收的路径和步骤。
