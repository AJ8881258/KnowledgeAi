# 后端任务书：阶段 14 do.md 修复与部署收尾

本任务书是后端 Agent 的固定入口。后续每个阶段都复用本文件，由协调者实时更新当前任务。后端 Agent 必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文件。

## 必读规则

- 后端现在默认由 Agent 正常直接开发。请按任务书直接修改后端业务代码、测试代码和必要配置，并运行相关验证命令；不再默认输出教学代码，除非用户明确要求只讲解、只给代码片段或“后端不要直接修改”。
- 不要修改已经执行过的 Flyway 迁移文件；如果确实需要表结构或索引变化，只能新增迁移文件。
- 任何接口路径、请求体、响应体或错误语义变化，都必须提醒协调者同步 `doc/API.md`。
- 新增或修改功能代码时，必须写有价值的业务注释或 JavaDoc，说明实现了什么功能、有哪些关键参数、参数含义是什么、与旧逻辑的区别是什么；不要给 import、基础注解、getter/setter 写噪声注释。
- 注释重点覆盖配置读取、密钥脱敏、模型选择、异步生成、未读状态、健康检查、日志、备份恢复、启动脚本和部署参数；不要为了注释而注释。

## 当前目标

阶段 14：部署与运维 + `do.md` 修复。

先修复影响真实 Chat 使用的后端问题：Chat 请求级模型选择、Settings 模型测试、用户模型配置隔离、空检索真实回答、生成失败脱敏和未读状态语义。部署与运维说明仍是阶段 14 后续收尾重点。

## 本轮任务

1. Chat 发送接口：
   - `POST /api/chat/sessions/{sessionId}/messages` 请求体支持可选 `model`。
   - `model` 只覆盖本次生成模型 ID，不覆盖 Base URL/API Key。
   - 传入 `model` 时同步保存为当前用户 Settings 当前模型。
2. 用户模型配置隔离：
   - Chat 调用优先使用当前 JWT 用户保存的 Base URL/API Key/Model。
   - 不串用其他用户配置，不通过 Chat 请求传 Base URL/API Key。
   - 用户没有完整模型配置时才允许回退环境变量兜底。
3. 空检索回答：
   - 没有命中文档 chunks 时仍调用当前用户模型生成回答。
   - `sources` 保持空数组，不伪造引用来源。
   - Prompt 要求模型说明当前没有可引用知识库片段。
4. 模型测试：
   - `POST /api/settings/model/test` 作为正式接口，支持复用已保存配置。
   - 成功/失败都必须脱敏，不泄露 API Key、Authorization header、完整 Base URL、model 或供应商原始错误。
5. 异步生成状态：
   - 成功后会话回到 `IDLE`，并按当前规则设置未读提醒。
   - 失败后会话进入 `FAILED`，写入脱敏 `lastErrorMessage`。
   - 后台生成成功或失败都表示会话有新终态，应该把 `unread` 置为 `true`；前端通过 `status` 区分成功或失败。
6. 部署与运维后续收尾：
   - 梳理数据库、JWT、模型供应商兜底配置、用户 API Key 加密密钥、日志、健康检查和 Swagger/OpenAPI 暴露策略。
   - 环境变量示例只能写占位值，不写真实密钥、真实 API Key、生产数据库密码。

## 建议涉及文件

可能修改：

- `backend/src/main/java/com/knowflow/backend/chat/**`
- `backend/src/main/java/com/knowflow/backend/settings/**`
- `backend/src/test/**`
- `backend/src/main/resources/application*.yaml`
- `.env.example` 或 `backend/.env.example`
- `README.md`

不应修改：

- 已执行的 Flyway 迁移文件。
- 前端业务组件。
- 真实密钥、真实 API Key、真实生产数据库配置。

## 验收命令

```powershell
cd backend
.\mvnw.cmd test
```

如修改了打包或配置，也建议运行：

```powershell
cd backend
.\mvnw.cmd package
```

## 手动验收说明

完成后给用户一份简短可执行步骤：

1. `/Settings` 保存 Base URL/API Key/Model 后测试模型。
2. `/Chat/{sessionId}` 选择模型并发送问题。
3. 空检索时也能返回助手回答，sources 为空。
4. 模型失败时会话状态为 `FAILED`，错误脱敏。
5. Header 未读统计只受 `unread` 影响；失败会话如果 `unread === true` 也应计入角标。

## 完成后输出

完成后请输出：

1. 修改了哪些文件。
2. Chat 请求级模型选择和 Settings 同步如何实现。
3. 模型配置隔离、脱敏和空检索回答如何保证。
4. 成功/失败状态与未读提醒如何分别表达。
5. 运行了哪些测试命令和结果。
6. 仍需前端或用户手动确认的事项。
