# 后端任务书：阶段 23 Settings 联系方式与头像存储状态契约同步

本文档是后端 Agent 的固定入口。后端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 22 后端默认头像持久化和二次验收 profile 修复已完成；阶段 23 正在同步联系方式、头像存储配置状态和 OSS 未配置提示契约。**

阶段 23 后端目标是让 Settings profile API 明确支持联系方式和头像上传配置状态：`UserResponse.phone`、`UserResponse.avatarStorageConfigured`、`PATCH /api/auth/me` 的 `phone` 更新，以及 OSS 未配置时头像上传返回中文脱敏提示“头像上传需要先配置 OSS 存储。”。复杂阶段和多子系统任务推荐采用团队编排模式：主对话担任项目经理/协调者，负责审核、拆分、下发、集成和最终验证；后端实现或复核任务优先拆分到 Codex 后台 Thread/worktree 或 `AGENT_TEAM`，且下发 worker 的思考/推理等级默认使用可用最高级（例如 `xhigh` / 最高级）。

## 已完成后端实现

核心改动：

- 默认头像持久化
  - 新增 Flyway 迁移 `V17__add_user_avatar_preset.sql`，为 `users` 增加 `avatar_preset_id`。
  - `User` 和 `UserRepository` 增加 `avatarPresetId` 映射。
  - 上传头像时清空 `avatar_preset_id`，选择默认头像时清空 `avatar_object_key`。
  - 选择默认头像时尽力删除旧 OSS 对象；删除头像接口同时清空上传头像和 preset。

- 新增 API
  - 新增 `PATCH /api/auth/me/avatar-preset`。
  - 请求体：`{ "avatarPresetId": "blue" }`。
  - 固定允许 preset：`blue`、`green`、`coral`、`violet`、`mint`、`rose`、`amber`、`slate`。
  - 非法 preset 返回 `400`。

- `UserResponse` 扩展
  - 新增 `avatarSource: "UPLOAD" | "PRESET" | "NONE"`。
  - 新增 `avatarPresetId: string | null`。
  - `avatarUrl` 仅在 `avatarSource=UPLOAD` 时返回短期签名 URL。
  - `avatarConfigured` 在上传头像或选择 preset 时为 `true`。
  - 阶段 23 新增 `phone: string | null` 和 `avatarStorageConfigured: boolean`。
  - 响应仍不返回 OSS object key、AccessKey、Secret、bucket 私密配置或永久 URL。

- 二次验收 profile 更新
  - `PATCH /api/auth/me` 支持可选更新 `username`、`email` 和 `phone`。
  - 请求体必须至少包含一个可更新字段。
  - `username` 会 trim，trim 后不能为空，长度上限 100，且不能与其他用户冲突。
  - `email` 省略时不修改；传入 `null` 或空字符串会清空；非空值会 trim、转小写，并校验格式、长度和唯一性。
  - `phone` 省略时不修改；传入 `null` 或空字符串会清空；非空值会 trim，长度为 5-32，只能包含数字、普通空格、`+`、`-` 和英文括号，并至少包含 5 个数字；联系方式不做唯一性校验，也不用于登录。
  - `UserResponse` 仍不返回密码哈希、OSS object key、密钥、Authorization header 或永久 URL。

- OSS 未配置提示
  - 头像上传接口在 OSS 配置不完整时返回 `400`。
  - 错误提示固定为“头像上传需要先配置 OSS 存储。”。
  - 错误响应不得泄露 OSS endpoint、bucket、AccessKey、Secret、object key、Authorization header 或模型密钥。

## 安全与注释要求

- 默认头像 preset 是后端 allow-list，不接受任意客户端字符串落库。
- 上传头像和默认头像互斥，避免前端同时存在 OSS URL 和 preset 两个来源。
- 选择 preset 删除旧 OSS 对象是尽力操作，不应泄露 OSS bucket、endpoint、AccessKey 或 object key。
- `avatarStorageConfigured` 只表示头像上传配置是否完整，不表示用户是否已设置头像；默认头像 preset 在 OSS 未配置时仍可用。
- 联系方式是 Settings 资料字段，不用于登录、唯一性校验、短信验证或通知发送。
- 后端新增 DTO、接口和 Service 分支必须保留有价值 JavaDoc/业务注释。

## 测试覆盖

新增测试：

- `Stage22DefaultAvatarTests`
- `Stage23ProfileContactTests`

覆盖重点：

- 选择默认头像成功持久化，`UserResponse` 返回 `avatarSource=PRESET` 和 `avatarPresetId`。
- 非法 preset 返回 `400`。
- 上传头像会清空 preset，并返回 `avatarSource=UPLOAD` 和短期 `avatarUrl`。
- 选择 preset 会清空上传头像 object key，并尽力删除旧 OSS 对象。
- 删除头像后返回 `avatarSource=NONE`，且不返回 `avatarUrl` 或 `avatarPresetId`。
- 响应不泄露 OSS object key 或密钥。
- 修改用户名成功。
- 修改邮箱成功。
- 清空邮箱成功。
- 修改联系方式成功，并在 `GET /api/auth/me` 中返回。
- 清空联系方式成功。
- 非法联系方式返回 `400`。
- OSS 未配置时头像上传返回“头像上传需要先配置 OSS 存储。”且不泄露敏感配置。
- OSS 未配置时默认头像 preset 仍可保存，并返回 `avatarStorageConfigured=false`。
- 空请求体、空用户名、过长用户名和重复用户名拒绝。

## 验证命令

阶段专项验证：

```powershell
cd backend
.\mvnw.cmd -Dtest=Stage22DefaultAvatarTests test
.\mvnw.cmd -Dtest=Stage23ProfileContactTests test
```

阶段收尾验证：

```powershell
cd backend
.\mvnw.cmd test
```

## 验证结果

- `.\mvnw.cmd -Dtest=Stage22DefaultAvatarTests test` 已通过：`6 tests, 0 failures, 0 errors`。
- `.\mvnw.cmd test` 已通过：`118 tests, 0 failures, 0 errors`。
- 阶段 23 专项测试由后端实现/验收 worker 运行并回填结果。
