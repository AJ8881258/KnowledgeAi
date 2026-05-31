# 后端任务书：阶段 19 语义索引运维与检索策略可控

本文档是后端 Agent 的固定入口。后端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 19 后端已完成，并已通过 PostgreSQL 完整后端集成回归。**

阶段 19 在阶段 18 可选 embedding 和混合召回基础上，新增用户级检索策略、混合权重配置和语义索引重建运维能力。目标是让用户可以明确选择全文检索或混合检索，并在不重新解析文档的情况下刷新语义向量。

## 数据库变更

新增 Flyway 迁移：

- `V15__semantic_index_ops_and_rag_strategy.sql`

主要变更：

- `user_rag_settings`
  - `retrieval_mode`
  - `semantic_weight`
  - `fulltext_weight`
- `document_processing_jobs.job_type` 约束支持 `REBUILD_SEMANTIC_INDEX`。

设计说明：

- `retrieval_mode` 让用户可以显式选择 `HYBRID` 或 `FULLTEXT`，不再只能被动依赖 embedding 是否可用。
- `semantic_weight` 和 `fulltext_weight` 让混合排序策略可控，后端校验两者之和必须为 `1`，避免分数被意外放大。
- `REBUILD_SEMANTIC_INDEX` 与 `UPLOAD_INDEX` / `REPROCESS` 分离，因为它只刷新 embedding，不重新读取原始文件、不替换 chunks，也不应让全文检索不可用。

## 已完成后端实现

核心改动：

- `SettingsService` 支持读取和保存 `retrievalMode`、`semanticWeight`、`fulltextWeight`。
- `RagSettingsResponse` 和 `UpdateRagSettingsRequest` 新增阶段 19 字段。
- `UserRagSettingsRepository` 支持新字段 upsert 和默认值读取。
- `DocumentRetrievalService` 按当前用户 RAG 设置执行：
  - `FULLTEXT`：跳过 embedding 查询，直接走 PostgreSQL 全文检索。
  - `HYBRID`：在 embedding 可用时按用户配置权重执行混合召回。
- `DocumentChunkRepository` 的混合检索 SQL 支持传入 `semanticWeight` 和 `fulltextWeight`。
- `DocumentProcessingJobService` 新增 `REBUILD_SEMANTIC_INDEX` 处理分支：
  - 校验文档已经 `INDEXED` 且存在 chunks。
  - 读取现有 chunks 内容生成 embedding。
  - 通过 `document_id + chunk_index` 写回向量，保留 chunk ID 和引用稳定性。
  - 不更新 `documents.status` 为 `PROCESSING`，失败时只更新 embedding 状态和任务状态。
- `DocumentController` 新增：
  - `POST /api/documents/{documentId}/semantic-index/rebuild`
  - `POST /api/knowledge-bases/{knowledgeBaseId}/semantic-index/rebuild`

## 权限与安全规则

- 语义索引重建只允许知识库 `OWNER` / `EDITOR` 执行。
- `VIEWER` 执行重建返回 `403`。
- 非成员访问仍走既有资源权限校验，返回 `404`，避免暴露资源存在性。
- 语义重建期间全文 chunks 保持可用，不伪造引用来源，不删除旧 chunks。
- embedding 和模型供应商错误必须脱敏，不泄露 API Key、Authorization header、完整 Base URL 或供应商敏感细节。

## 检索语义

- 默认 RAG 设置：
  - `retrievalMode = HYBRID`
  - `semanticWeight = 0.7`
  - `fulltextWeight = 0.3`
- `FULLTEXT` 模式：
  - 不调用 embedding 客户端。
  - 检索结果 `retrievalMode = FULLTEXT`。
  - 适合禁用语义检索、排查向量问题或降低模型调用成本。
- `HYBRID` 模式：
  - embedding 配置和用户模型配置可用时生成 query embedding。
  - 使用用户配置的语义/全文权重排序。
  - embedding 不可用、生成失败、文档没有可用向量或语义分全为 0 时降级全文检索。

## 测试覆盖

新增测试：

- `Stage19SemanticIndexOpsTests`

覆盖重点：

- `GET/PATCH /api/settings/rag` 返回和保存检索策略与权重。
- 混合检索使用用户保存的权重排序。
- 文档级语义索引重建保留 chunk ID 和文档 `INDEXED` 状态。
- `VIEWER` 不能重建文档或知识库语义索引。
- 知识库级语义索引重建只为已索引且有 chunks 的文档创建任务。
- 阶段 7-19 既有回归仍通过。

## 验证命令与结果

已运行：

```powershell
cd backend
.\mvnw.cmd test
```

结果：

- 后端完整测试通过。

后续如继续修改阶段 19 后端代码，至少重新运行：

```powershell
cd backend
.\mvnw.cmd test
```
