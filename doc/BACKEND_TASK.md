# 后端任务书：阶段 18 语义检索与混合召回

本文档是后端 Agent 的固定入口。后端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 18 后端已完成，并已通过 PostgreSQL 完整后端集成回归。**

阶段 18 在阶段 9 全文检索、阶段 17 持久化文档处理任务的基础上，加入可选 embedding、pgvector 字段和 Search/Chat 共用的混合召回路径。embedding 不是强依赖：未配置、调用失败或文档无可用向量时，系统必须继续走全文检索。

## 数据库变更

新增 Flyway 迁移：

- `V14__add_semantic_retrieval_embeddings.sql`

主要变更：

- `CREATE EXTENSION IF NOT EXISTS vector`
- `documents`
  - `embedding_status`
  - `embedding_error_message`
  - `embedding_updated_at`
- `document_chunks`
  - `embedding vector`
  - `embedding_status`
  - `embedding_updated_at`
- `chat_message_sources`
  - `hybrid_score`
  - `fulltext_score`
  - `semantic_score`
  - `retrieval_mode`

设计说明：

- `documents.embedding_status` 给前端展示文档级语义索引状态，避免用户误以为全文检索失败就是文档不可用。
- `document_chunks.embedding` 保存 pgvector 向量；文本 chunks 仍是检索和引用来源的基础。
- `chat_message_sources` 保存分数拆解，保证历史回答也能展示当时的召回模式和分数。

## 已完成后端实现

新增文件：

- `backend/src/main/java/com/knowflow/backend/document/rag/EmbeddingModelClient.java`
- `backend/src/main/java/com/knowflow/backend/document/rag/OpenAiCompatibleEmbeddingModelClient.java`
- `backend/src/main/java/com/knowflow/backend/document/rag/DocumentRetrievalService.java`

核心改动：

- `AiProperties` 新增 `embeddingModel`，对应环境变量 `KNOWFLOW_AI_EMBEDDING_MODEL`。
- Docker PostgreSQL 镜像切换为 `pgvector/pgvector:pg17`。
- `DocumentProcessingJobService` 在写入 chunks 后尝试生成 embedding，并按结果写入 `INDEXED`、`SKIPPED` 或 `FAILED`。
- `DocumentRepository`、`DocumentChunkRepository` 支持 embedding 状态写入、全文检索降级和混合检索 SQL。
- `DocumentController` 的知识库检索接口改为走 `DocumentRetrievalService`。
- `ChatGenerationService` 也使用同一个 `DocumentRetrievalService`，保证 Chat prompt 上下文与返回给前端的 sources 完全一致。
- `DocumentResponse` 返回 `embeddingStatus`、`embeddingErrorMessage`、`embeddingUpdatedAt`。
- `SearchResultResponse` 和 `ChatSourceResponse` 返回 `hybridScore`、`fulltextScore`、`semanticScore`、`retrievalMode`，并保留兼容字段 `score`。

## 检索语义

- 未配置 `KNOWFLOW_AI_EMBEDDING_MODEL`：直接走 PostgreSQL 全文检索，`retrievalMode = FULLTEXT`。
- 已配置 embedding 且用户模型配置或环境兜底配置可用：查询时先生成 query embedding，再执行混合召回。
- 混合召回当前排序：`semanticScore * 0.7 + fulltextScore * 0.3`。
- 如果 embedding 调用失败、返回空向量、文档没有可用向量或语义分全为 0，后端自动降级为全文检索。
- `score` 是兼容字段：混合模式下等于 `hybridScore`，全文模式下等于 `fulltextScore`。

## 安全与降级规则

- embedding 调用使用当前用户保存的 Base URL/API Key；没有用户配置时才使用环境变量兜底。
- API Key 永远不返回前端，不写入日志，不进入错误响应。
- embedding 失败不应导致文档上传、重新处理、Search 或 Chat 失败；失败只影响语义增强，全文检索仍可用。
- Search 和 Chat 仍必须按知识库成员权限隔离，非成员返回 `404`。
- Chat 引用来源仍只来自真实 chunks，不伪造来源；空检索或关闭 RAG 时 `sources: []`。

## 测试覆盖

新增测试：

- `Stage18HybridRetrievalTests`

覆盖重点：

- 文档上传处理成功后写入 embedding 状态。
- 混合检索返回 `HYBRID`，并返回语义分、全文分和混合分。
- Chat sources 使用同一套混合召回排序和分数拆解。
- embedding 生成失败时文档状态仍可用，检索降级为 `FULLTEXT`。
- 阶段 7-18 既有回归仍通过。

## 验证命令与结果

已运行：

```powershell
cd backend
.\mvnw.cmd test
```

结果：

- 95 个测试全部通过。

后续如继续修改阶段 18 后端代码，至少重新运行：

```powershell
cd backend
.\mvnw.cmd test
```
