# 后端任务书：阶段 21 Chat SSE 流式输出、头像上传与 @ 文件上下文

本文档是后端 Agent 的固定入口。后端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 21 后端已完成，并已通过完整后端回归验证。**

阶段 21 后端目标是把 Chat 生成升级为 SSE 流式输出并边流边保存，同时新增用户头像 OSS 上传能力，以及 Chat 文件上下文解析能力：显式 `mentionedDocumentIds` 优先，未显式 mention 时按用户问题中的文件标题做启发式匹配。

## 已完成后端实现

核心改动：

- Chat SSE 流式输出
  - 新增 `POST /api/chat/sessions/{sessionId}/messages/stream`，响应 `text/event-stream`。
  - 新增 `ChatStreamingService`，复用当前用户模型配置、RAG 设置、权限校验、打断 generationId 和错误脱敏规则。
  - 新增 `ChatModelClient.stream(...)` 和 OpenAI-compatible SSE 解析能力。
  - 流式事件包括 `session`、`user_message`、`assistant_message`、`delta`、`sources`、`done`、`error`。
  - 第一个 delta 到达后创建 `ASSISTANT` 消息，后续 delta 持续更新同一条助手消息，刷新页面可看到已生成内容。
  - 打断后通过 `active_generation_id` 阻止旧流继续写入消息、sources 或覆盖会话状态。

- `@` 文件上下文和标题感知匹配
  - `SendMessageRequest` 新增 `mentionedDocumentIds`。
  - 非流式发送接口和流式接口都支持 `mentionedDocumentIds`。
  - 新增 `ChatDocumentContextService`，先校验 mention 文档属于当前会话知识库且当前用户可访问；跨知识库或无权限文档返回隐藏式 `404`。
  - 未显式 mention 时，服务会规范化文件名和问题文本，去除扩展名、书名号、复制编号、空白、下划线、括号和常见前缀噪声，用于匹配类似 `202502150239_邓林峰_《微服务核心组件实验》实验报告 (2).docx` 的文档标题。
  - 有显式 mention 或标题匹配命中文档时，RAG 检索限定在这些文档的已索引 chunks 内，并把文档名写入 prompt。
  - `ragEnabled=false` 时跳过知识库检索，即使传了 mention 也返回 `sources: []`。

- OSS 头像上传
  - 新增 `V16__add_user_avatar_metadata.sql`，为 `users` 增加 `avatar_object_key`、`avatar_updated_at`。
  - 新增 `OssProperties` 和 `knowflow.oss.*` 配置读取。
  - 新增 `AvatarStorageService` 与 `AliyunOssAvatarStorageService`。
  - 新增 `POST /api/auth/me/avatar` 和 `DELETE /api/auth/me/avatar`。
  - `UserResponse` 新增 `avatarUrl`、`avatarConfigured`；后端只返回短期签名 URL，不返回 object key、AccessKey、Secret 或 bucket 私密配置。
  - 上传校验文件大小、Content-Type 和图片魔数，支持 JPEG/PNG/WebP，大小上限 2MB。
  - 删除头像时清空数据库引用，并尽力删除 OSS 对象。

## 安全与注释要求

- API Key、Authorization、完整 Base URL、model、OSS AccessKey、OSS Secret、bucket 私密配置、JDBC URL 和供应商敏感原始错误不得出现在 API 响应、toast 文案或日志级用户可见错误中。
- 后端新增/修改功能代码必须保留有价值注释或 JavaDoc，重点说明：
  - 为什么流式 delta 需要边流边保存。
  - 为什么保存前要校验 `active_generation_id`，避免打断后的旧流写入。
  - 为什么 `mentionedDocumentIds` 必须按当前会话知识库和当前用户权限校验。
  - 为什么标题感知匹配只是辅助能力，显式 `@` mention 优先。
  - 为什么头像只保存 object key，读取时生成短期签名 URL。
  - 为什么 OSS 密钥和 API Key 不能返回给前端。

## 测试覆盖

新增测试：

- `Stage21StreamingAvatarMentionTests`

覆盖重点：

- 流式接口返回 SSE 事件，包含 `user_message`、`assistant_message`、`delta`、`done`。
- 流式 delta 持续更新同一条 `ASSISTANT` 消息，刷新后可读取已生成内容。
- 打断流式生成后，旧 generationId 不能继续写入消息内容或覆盖 session 状态。
- `mentionedDocumentIds` 只允许当前会话知识库内可访问文档。
- 用户问题包含 `《微服务核心组件实验》实验报告` 时，可匹配带前缀和复制编号的 docx 文件名。
- `ragEnabled=false` 时不检索 mention 文档，`sources` 为空。
- 头像上传校验类型和大小；fake storage 下返回签名 `avatarUrl` 且不泄露密钥。

## 验证命令

专项测试已运行：

```powershell
cd backend
.\mvnw.cmd -Dtest=Stage21StreamingAvatarMentionTests test
```

结果：

- 阶段 21 专项测试通过，7 个测试全部成功。

阶段收尾已运行：

```powershell
cd backend
.\mvnw.cmd test
```

结果：

- 后端完整回归通过，112 个测试全部成功。
