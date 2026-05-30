# 后端任务书：阶段 15 知识库质量与文档处理增强

本文档是后端 Agent 的固定入口。后端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 15 规划中，待实现。**

阶段 15 聚焦文档处理质量和 RAG 可信度：让用户能看到文档是否处理得好、失败后能重试、必要时能重新处理文档，并为文档生成摘要。不要在本阶段引入 SSE、embedding/pgvector、OCR、PPT/Excel 解析、消息队列或复杂任务中心。

## 后端目标

- 增强文档详情和文档列表的质量信息。
- 支持文档重新处理和失败重试。
- 支持文档级摘要生成。
- 确保检索和 Chat 引用继续只来自真实 chunks，不伪造来源。
- 保持知识库成员权限模型：`OWNER` / `EDITOR` 可修改文档，`VIEWER` 只能查看。

## 计划接口

以 `doc/API.md` 为准，阶段 15 规划接口包括：

- `POST /api/documents/{documentId}/reprocess`
- `GET /api/documents/{documentId}/quality`
- `POST /api/documents/{documentId}/summary`

如果实现过程中调整路径、字段或状态语义，必须同步 `doc/API.md`。

## 实现要求

1. 文档质量信息
   - 为文档详情或质量接口返回 `chunkCount`、`charCount`、`averageChunkLength`、`minChunkLength`、`maxChunkLength`、`qualityWarnings`。
   - `qualityWarnings` 第一版使用简单规则即可，例如无 chunk、正文过短、chunk 过短、chunk 过长。
   - 质量信息只帮助用户判断文档是否适合 RAG，不改变检索排序。

2. 文档重新处理
   - `POST /api/documents/{documentId}/reprocess` 只允许 `OWNER` / `EDITOR`。
   - `VIEWER` 返回 `403`，非成员返回 `404`。
   - 重新处理应复用已保存的原始文件或当前项目已有的可重建文本来源；如果当前存储结构无法重建，必须明确返回可理解错误，不要假装成功。
   - 成功后替换旧 chunks，并让后续检索和 Chat 引用使用新 chunks。
   - 失败时写入脱敏 `errorMessage`，状态和 chunks 处理策略必须一致。

3. 失败重试
   - `FAILED` 文档应能通过重新处理接口重试。
   - 错误信息不能暴露服务器绝对路径、内部堆栈、供应商密钥或环境变量。

4. 文档摘要
   - `POST /api/documents/{documentId}/summary` 使用当前用户模型配置生成摘要；未配置用户模型时可回退后端环境变量配置。
   - 摘要请求应限制输入长度和输出长度，避免 token 成本失控。
   - 摘要保存位置可以是文档表新增字段或独立表，但必须通过 Flyway 新迁移实现，不修改已执行迁移。
   - 摘要失败时返回脱敏错误。
   - 摘要不能作为 Chat 引用来源；引用仍必须来自真实 chunks。

5. 注释要求
   - 后端新增或修改功能代码必须写有价值注释或 JavaDoc。
   - 重点说明：质量指标含义、重新处理为什么要替换 chunks、失败状态如何落库、摘要为什么不能替代引用来源、权限判断为什么区分成员和角色。

## 测试要求

至少覆盖：

- `OWNER` / `EDITOR` 可以重新处理文档。
- `VIEWER` 重新处理文档返回 `403`。
- 非成员访问文档重新处理或质量接口返回 `404`。
- 重新处理成功后旧 chunks 被替换，检索使用新 chunks。
- 重新处理失败时文档状态和错误信息正确，错误脱敏。
- 文档质量接口返回 chunk 数、字符数、平均长度和质量提示。
- 文档摘要使用当前用户模型配置，不串用其他用户配置。
- 摘要失败时错误脱敏。
- 阶段 7-14 既有测试仍通过。

## 验证命令

```powershell
cd backend
.\mvnw.cmd test
```

如新增针对单个测试类的快速验证，也要在最终完成前运行全量后端测试。
