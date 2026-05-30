# 前端任务书/验收记录：阶段 14 Docker 化与运维收尾

本文档是前端 Agent 的固定入口。后续阶段继续复用本文件，由协调者更新当前任务和验收记录。前端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 14 已完成。**

阶段 14 目标是完成 Docker 化和运维收尾，并记录 `do.md` 中影响真实使用的 Chat、Settings、Header 和响应式体验问题修复完成情况。本轮收尾新增 Chat `ragEnabled` 请求字段和生成打断接口，`doc/API.md` 已同步更新。

## 阶段 14 前端完成记录

已完成能力：

- README 已补充前端本地开发启动：`pnpm dev`。
- README 已补充前端生产构建：`pnpm build`。
- Docker 全量启动后，前端通过 Nginx 容器提供访问入口，默认宿主机端口为 `KNOWFLOW_FRONTEND_PORT=5173`。
- Chat 输入区支持选择模型，模型来源于 Settings 可用模型列表或用户手动输入。
- Settings `Chat Model` 使用显式“可输入 + 下拉选择”控件；获取模型列表后可点击下拉选择，没有列表时仍可手动输入模型 ID。
- Chat 输入区不再内置硬编码默认模型列表；只有用户已保存或实际选择模型时才传递 `model`，避免绕开后端 `.env` 兜底配置。
- 发送消息时通过 `src/api/chat.ts` 传递可选 `model` 和 `ragEnabled` 字段。
- RAG 开关提供 hover 提示：开启时检索知识库片段并展示引用，关闭时只按当前会话和模型回答且不生成引用来源。
- 当前会话生成中时，RAG 开关和模型选择禁用，发送按钮切换为“打断”并调用 `POST /api/chat/sessions/{sessionId}/cancel`。
- Chat 进入或切换会话时自动滚动到消息底部。
- Chat 轮询和生成完成时只更新内部消息/会话状态，不要求刷新整个右侧内容区域。
- `sources: []` 作为正常状态处理，显示无引用来源提示，不暗示必须先索引 chunks 才能普通对话。
- 右侧引用来源面板跟随当前选中的助手回答展示。
- Settings “Chat Model”和“手动模型名称”已收敛为既可选择也可手动输入的控件。
- Settings 接入真实模型测试能力。
- Settings API Key 不明文回显，不写入组件级 `localStorage`。
- 退出登录先弹出确认，再清理登录状态并跳转 `/login`。
- Header 未读角标只按 `unread === true` 的会话数量统计；成功/失败状态由 `status` 单独表达。
- 侧边栏今日交谈次数继续来自后端统计接口，不使用组件级 `localStorage`。
- 响应式问题已按阶段 14 收尾记录处理，重点覆盖 Settings、Chat、Header、Sidebar 的移动端和窄屏可用性。

## 验收记录

阶段 14 前端侧验收口径：

- 本地启动命令：`pnpm dev`。
- 生产构建命令：`pnpm build`。
- Docker 全量启动命令：`docker compose up -d --build`。
- Docker 前端访问：`http://localhost:5173`，或 `.env` 中 `KNOWFLOW_FRONTEND_PORT` 指定的端口。

本次协调者已完成前端侧验证：

- `pnpm build`：通过，只有 Vite 大 chunk 警告。
- `pnpm eslint src/pages/Settings.tsx src/pages/Chat.tsx src/api/settings.ts src/api/chat.ts src/components/settings src/components/chat-page src/components/chat/ChatComposer.tsx src/components/MainHeader.tsx src/components/slider-sidebar.tsx`：通过。
- `docker compose up -d --build`：前端生产镜像构建通过，Nginx 容器成功启动。
- Compose 已验证关键 secrets 必须由 `.env` 或 `--env-file` 提供，缺少 `POSTGRES_PASSWORD`、`KNOWFLOW_JWT_SECRET` 或 `KNOWFLOW_MODEL_SECRET_KEY` 时会拒绝启动。
- `Invoke-RestMethod http://localhost:5173/api/health`：经 Nginx `/api` 代理返回 `{"status":"UP"}`。
- `browser-use --headed --session knowflow-stage14-docker open http://127.0.0.1:5173`：通过可见窗口打开 Docker 前端。
- browser-use 验证空 Docker 数据库下 `WuLong / WuLong` 登录失败后可注册同名账号，注册后进入工作台。
- browser-use 验证 `/Settings` 可访问，账号资料、模型配置、RAG 参数和危险区正常展示。
- browser-use 验证 `/Chat` 在无知识库时显示空状态；创建知识库后可进入 Chat 主界面。
- browser-use 在未配置真实模型时发送“你好”，后端返回脱敏提示 `Model settings are incomplete`，符合无真实模型配置时只能验收页面流程和错误脱敏的边界。

## 剩余人工验收条件

完整 Chat 真实回答验收必须由用户提供真实模型配置：

1. `/Settings` 保存真实 Base URL/API Key/Model。
2. `/Settings` 点击模型测试，确认模型可用。
3. `/Chat/{sessionId}` 在输入区选择模型并发送问题。
4. 确认进入生成状态，生成完成后显示助手回答。
5. 选择不同助手回答时，右侧引用来源跟随变化。
6. 无引用来源时显示空来源提示，不显示假引用。
7. 后台生成完成或失败后，Header 未读角标只按 `unread` 数量变化。
8. 在移动端或窄屏下检查 Chat、Settings、Header、Sidebar 无明显溢出、错位或不可操作控件。

## 后续阶段建议

阶段 14 已收尾。后续如果继续扩展前端，建议从以下方向新开阶段：

- SSE/流式输出体验。
- 向量检索结果解释和混合检索 UI。
- OCR/PPT/Excel 上传提示和处理状态。
- 更细的协作权限可视化。
- 生产级错误页、空状态和可观测性入口。

新增前端请求必须继续走 `src/api/` axios wrapper，不新增直接 `fetch`、组件级 `localStorage` 或 mock-only 逻辑。
