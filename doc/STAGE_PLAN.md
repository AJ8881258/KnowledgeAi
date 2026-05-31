# KnowFlow AI 阶段计划

本文档是 KnowFlow AI 后续开发的权威阶段计划、阶段状态和验收记录。API 契约以 `doc/API.md` 为准；项目概览和运行方式以 `doc/PROJECT.md` 为准；前后端执行记录分别以 `doc/FRONTEND_TASK.md` 和 `doc/BACKEND_TASK.md` 为准。

## 使用规则

- 每完成一个阶段，更新本文档的阶段状态、完成内容和验收结果。
- 后端接口契约变化必须同步 `doc/API.md`。
- 项目状态、运行方式或部署方式变化必须同步 `doc/PROJECT.md`。
- 前后端任务书使用固定文件 `doc/FRONTEND_TASK.md` 和 `doc/BACKEND_TASK.md`。
- `doc/` 下只保留核心文档：`STAGE_PLAN.md`、`PROJECT.md`、`API.md`、`FRONTEND_TASK.md`、`BACKEND_TASK.md`。
- 文档/规划/指挥会话只同步核心文档和必要规则，不修改 `src/`、`backend/`、Docker 等业务/运行文件。

## 当前阶段总览

| 阶段 | 状态 | 依据 |
|---|---|---|
| 阶段 0：前端静态原型 | 已完成 | Dashboard、KnowledgeBases、Documents、Chat、Settings 静态页面完成。 |
| 阶段 1：后端基础设施 | 已完成 | Spring Boot、PostgreSQL、Flyway、基础表结构完成。 |
| 阶段 2：认证闭环 | 已完成 | 注册、登录、JWT、重置密码、前端登录接入完成。 |
| 阶段 3：知识库 CRUD | 已完成 | 后端 CRUD、用户隔离、前端真实接口接入完成。 |
| 阶段 4：文档上传、解析、切片 | 已完成 | 文档上传、解析、切片、状态流转和前端接入完成。 |
| 阶段 5：文档检索 MVP | 已完成 | 知识库内文档片段检索、检索测试区和接口契约完成。 |
| 阶段 6：RAG 问答 MVP | 已完成 | 检索、Prompt、模型调用、消息保存、引用来源和会话管理闭环完成。 |
| 阶段 7：前端体验完善 | 已完成 | 真实数据状态、页面拆分、加载/错误/空状态和代码级验证完成。 |
| 阶段 8：Settings 功能接入与交付整理 | 已完成 | 邮箱、RAG 参数、账号删除、Settings 后端接入和交付资料整理完成。 |
| 阶段 9：检索质量升级 | 已完成 | PostgreSQL 全文检索、相关度分数和引用排序完成。 |
| 阶段 10：RAG 体验增强 | 已完成 | 多轮上下文、空检索降级、引用体验和模型错误脱敏完成。 |
| 阶段 11：文档处理增强 | 已完成 | 新增 `.docx`、`.html/.htm` 文本提取，保持同步处理和 10MB 上限。 |
| 阶段 12：权限与团队协作 | 已完成 | 单个知识库共享、`OWNER`/`EDITOR`/`VIEWER` 成员权限和前后端接入完成。 |
| 阶段 13：用户模型配置、偏好设置与多会话协同增强 | 已完成 | 用户级模型配置、API Key 加密、未读会话、后台生成、今日交谈次数完成。 |
| 阶段 14：Docker 化与运维 + do.md 收尾修复 | 已完成 | Docker 全量启动、README 运维说明、构建/健康检查/日志/备份恢复文档完成；`do.md` 新增验收问题已完成代码和 API 文档同步。 |
| 阶段 15：知识库质量与文档处理增强 | 已完成 | 文档质量指标、重新处理、摘要生成、前端展示和阶段 15 回归验证完成。 |
| 阶段 16：文档处理可靠性与真正失败重试 | 已完成 | 上传时保存原始文件 bytes 和成功解析文本，重新处理优先使用原始来源，失败无 chunks 文档可真正重试，前端按可重试能力控制入口。 |
| 阶段 17：后台任务化与文档处理进度 | 已完成 | 新增文档处理任务表、上传/重新处理任务记录、进度查询接口和 Documents 轮询进度 UI；完整后端回归、前端构建/ESLint 和 browser-use 验收已通过。 |
| 阶段 18：语义检索与混合召回 | 已完成 | 新增 pgvector、可选 embedding、全文+语义混合排序、检索/Chat 分数拆解和 embedding 状态展示；后端完整回归、前端构建和目标 ESLint 已通过。 |
| 阶段 19：语义索引运维与检索策略可控 | 已完成 | 新增语义索引重建任务、RAG 检索策略和权重配置、Settings 策略 UI、文档/知识库重建入口和阶段 19 回归验证。 |

## 阶段 19：语义索引运维与检索策略可控

### 目标

阶段 19 在阶段 18 的可选语义检索基础上，把“是否使用语义检索”和“语义/全文权重”交给用户控制，并补齐不重新解析文档的语义索引重建运维入口。

### 范围

- 数据库：
  - 新增 Flyway 迁移 `V15__semantic_index_ops_and_rag_strategy.sql`。
  - `user_rag_settings` 新增 `retrieval_mode`、`semantic_weight`、`fulltext_weight`。
  - `document_processing_jobs.job_type` 支持 `REBUILD_SEMANTIC_INDEX`。
- 后端：
  - `GET/PATCH /api/settings/rag` 返回和保存检索策略与权重。
  - `DocumentRetrievalService` 按当前用户 RAG 设置执行 `HYBRID` 或 `FULLTEXT`。
  - 混合召回按用户配置权重排序；全文模式跳过 embedding 查询，降低成本并便于排障。
  - 新增文档级和知识库级语义索引重建接口，只刷新现有 chunks 的 embedding，不重新解析来源、不替换 chunks、不让全文检索不可用。
- 前端：
  - Settings RAG 参数区新增检索策略和语义/全文权重控制。
  - Documents 列表、详情和知识库详情页增加语义索引重建入口。
  - VIEWER 不展示可执行重建入口，`OWNER`/`EDITOR` 可创建重建任务。

### 不做

- 不新增 OCR、PPT、Excel 解析。
- 不做向量索引可视化后台或复杂任务中心。
- 不改变 Chat 会话和引用来源的数据结构。
- 不做 SSE / 流式输出。

### 已完成内容

- 新增 `V15__semantic_index_ops_and_rag_strategy.sql`。
- RAG 设置默认值为 `retrievalMode = HYBRID`、`semanticWeight = 0.7`、`fulltextWeight = 0.3`，并校验权重和为 1。
- `FULLTEXT` 模式会跳过 embedding 查询，只使用 PostgreSQL 全文检索。
- `HYBRID` 模式使用用户配置权重进行混合排序。
- 新增 `POST /api/documents/{documentId}/semantic-index/rebuild`。
- 新增 `POST /api/knowledge-bases/{knowledgeBaseId}/semantic-index/rebuild`。
- 语义重建任务保留文档 `INDEXED` 状态和原有 chunks，只更新 embedding 字段和任务状态。
- 前端已接入 RAG 策略 UI、语义权重 UI、文档级和知识库级语义索引重建入口。

### 验收结果

- `cd backend && .\mvnw.cmd test` 已通过。
- `pnpm build` 已通过。
- 目标 ESLint 已通过：
  `pnpm exec eslint src/api/documents.ts src/api/settings.ts src/api/chat.ts src/pages/Documents.tsx src/pages/Settings.tsx src/components/documents/document-table.tsx src/components/documents/document-details.tsx src/components/knowledge-bases/knowledge-base-detail-view.tsx src/components/knowledge-bases/knowledge-base-search-panel.tsx src/components/settings/settings-rag.ts src/components/settings/rag-settings-section.tsx src/components/settings/settings-components.tsx`。

## 阶段 18：语义检索与混合召回

### 目标

阶段 18 把阶段 9 的 PostgreSQL 全文检索升级为可选语义检索增强：在不强制依赖 embedding 服务的前提下，为已索引文档写入向量，检索和 Chat 共用同一套混合召回路径，并让前端能看到全文分、语义分、混合分和实际召回模式。

### 范围

- 数据库：
  - 使用 `pgvector/pgvector:pg17` 镜像，并通过 Flyway `V14__add_semantic_retrieval_embeddings.sql` 创建 `vector` 扩展。
  - `documents` 增加 `embedding_status`、`embedding_error_message`、`embedding_updated_at`。
  - `document_chunks` 增加 `embedding`、`embedding_status`、`embedding_updated_at`。
  - `chat_message_sources` 增加 `hybrid_score`、`fulltext_score`、`semantic_score`、`retrieval_mode`。
- 后端：
  - 新增 `EmbeddingModelClient` 和 OpenAI-compatible `/embeddings` 客户端。
  - 新增 `DocumentRetrievalService` 作为 Search API 和 Chat RAG 的统一检索入口。
  - 文档处理成功写入 chunks 后尝试生成 embedding；embedding 缺失或失败时文档仍可通过全文检索使用。
  - 配置 `KNOWFLOW_AI_EMBEDDING_MODEL` 时启用语义检索；未配置时保持全文检索。
  - 混合召回返回 `score`、`hybridScore`、`fulltextScore`、`semanticScore`、`retrievalMode`，其中 `score` 继续作为兼容字段。
- 前端：
  - Documents 和知识库详情展示文档 embedding 状态。
  - 知识库检索测试区展示召回模式、混合分、全文分和语义分。
  - Chat 引用来源展示同一套分数拆解，确保用户知道回答引用来自全文、语义或混合召回。

### 不做

- 不强制要求用户配置 embedding 模型。
- 不做向量索引后台重建任务和召回权重 UI 配置。
- 不做 OCR。
- 不做 PPT / Excel 解析。
- 不做 SSE / 流式输出。
- 不做 Agent 工作流。

### 已完成内容

- 新增 Flyway 迁移 `V14__add_semantic_retrieval_embeddings.sql`。
- 根目录 `compose.yaml` 和 `backend/compose.yaml` 的 PostgreSQL 镜像已切换为 `pgvector/pgvector:pg17`。
- `.env.example` 新增 `KNOWFLOW_AI_EMBEDDING_MODEL`。
- 文档上传和重新处理会在写入 chunks 后尝试写入 embedding 状态和向量。
- Search API 和 Chat RAG 已统一走 `DocumentRetrievalService`，保证 sources 与 prompt 上下文一致。
- embedding 不可用、生成失败或查询向量失败时，后端自动降级为全文检索，不阻断上传、检索和 Chat。
- `DocumentResponse` 已返回 `embeddingStatus`、`embeddingErrorMessage`、`embeddingUpdatedAt`。
- Search 结果和 Chat 引用来源已返回 `hybridScore`、`fulltextScore`、`semanticScore`、`retrievalMode`。
- 前端知识库检索区、Chat 引用来源、Documents 列表和详情已展示 embedding 状态与分数拆解。

### 验收结果

- `cd backend && .\mvnw.cmd test` 已通过，95 个测试全部成功。
- `pnpm build` 已通过。
- 目标 ESLint 已通过：
  `pnpm exec eslint src/api/documents.ts src/api/chat.ts src/components/knowledge-bases/knowledge-base-search-panel.tsx src/components/knowledge-bases/knowledge-base-detail-view.tsx src/components/chat-page/rag-chat-workspace.tsx src/components/documents/document-table.tsx src/components/documents/document-details.tsx`。

## 阶段 17：后台任务化与文档处理进度

### 目标

阶段 17 把文档上传和重新处理从“只看最终文档状态”升级为“可持久化、可查询、可恢复展示的处理任务”。第一版不引入 MQ 或复杂任务中心，只用 PostgreSQL 记录任务状态和粗粒度进度，让用户在 Documents 页面看到后台处理是否排队、运行、成功或失败。

### 范围

- 数据库：
  - 新增 `document_processing_jobs`。
  - 记录 `UPLOAD_INDEX` / `REPROCESS` 两类任务。
  - 记录 `QUEUED`、`RUNNING`、`SUCCEEDED`、`FAILED`、`CANCELED` 状态。
  - 记录 0-100 粗粒度进度、阶段、消息、错误、开始和结束时间。
- 后端：
  - 上传文档时创建 `UPLOAD_INDEX` 任务。
  - 重新处理文档时创建 `REPROCESS` 任务。
  - 处理逻辑下沉到 `DocumentProcessingJobService`，控制器只负责权限、基础校验、任务创建和启动。
  - 默认保持同步执行，确保旧阶段测试和 API 行为稳定；可通过 `knowflow.documents.processing.async-enabled=true` 开启后台执行。
  - 提供知识库级、文档级、单任务级查询接口。
- 前端：
  - `src/api/documents.ts` 新增处理任务类型和 wrapper。
  - Documents 页面加载最近任务，轮询活跃任务。
  - 文档列表显示后台处理进度，活跃任务期间禁用重复重新处理。
  - 文档详情显示最近一次任务的进度、阶段、消息和错误。

### 不做

- 不做 MQ / RabbitMQ / Kafka。
- 不做复杂后台任务中心或任务管理后台。
- 不做 OCR。
- 不做 PPT / Excel 解析。
- 不做 embedding / pgvector。
- 不做 SSE/流式任务进度推送。
- 不改变 Chat 引用来源规则；引用仍必须来自真实 chunks。

### 已完成内容

- 新增 Flyway 迁移 `V13__create_document_processing_jobs.sql`。
- 新增 `DocumentProcessingJob`、`DocumentProcessingJobResponse`、`DocumentProcessingJobRepository`。
- 新增 `DocumentProcessingJobService`，统一处理上传索引和重新处理任务的状态流转、进度更新、事务写 chunks、失败脱敏。
- 新增 `DocumentProcessingJobRunner` 和 `DocumentProcessingAsyncWorker`，支持同步默认执行和可配置异步执行。
- `DocumentController` 上传和重新处理路径已改为先创建任务再启动 runner。
- 新增接口：
  - `GET /api/knowledge-bases/{knowledgeBaseId}/document-processing-jobs`
  - `GET /api/documents/{documentId}/processing-jobs`
  - `GET /api/document-processing-jobs/{jobId}`
- 前端 `Documents` 页面已接入任务列表、活跃任务轮询、任务进度展示和重复重新处理禁用。
- 上传和重新处理成功后会刷新任务列表，异步模式下可进入轮询。

### 验收结果

- `cd backend && .\mvnw.cmd test` 已通过，91 个测试全部成功。
- `pnpm build` 已通过，只有 Vite 大 chunk 警告。
- `pnpm eslint src/pages/Documents.tsx src/api/documents.ts src/components/documents` 已通过。
- `browser-use` 已验证 `/Documents`：登录、上传 TXT、查看 `UPLOAD_INDEX` 任务、重新处理生成 `REPROCESS` 任务、查看 chunks 预览均正常。

## 阶段 16：文档处理可靠性与真正失败重试

### 目标

阶段 16 补齐阶段 15 暴露出的真实缺口：失败文档如果从未生成 chunks，就不能只靠已有 chunks 做重试。本阶段先不引入复杂任务队列，保持同步处理流程，优先把“原始来源持久化”和“真正失败重试”做稳。

### 范围

- 原始来源持久化：
  - `documents` 表新增 `source_bytes`、`source_text`、`source_text_updated_at`。
  - 上传时先保存原始文件 bytes，即使后续解析失败也保留可重试来源。
  - 成功解析后保存规范化 `source_text`，作为二级重试来源。
- 真正失败重试：
  - `POST /api/documents/{documentId}/reprocess` 优先使用原始 bytes 重新解析。
  - 如果没有原始 bytes，则使用保存的 `source_text`。
  - 如果前两者都不存在，则保留阶段 15 的 chunks fallback，兼容旧数据。
  - 如果原始来源和 chunks 都不存在，返回明确 `400`，文档保持 `FAILED`，不伪造成重试成功。
- 响应能力标识：
  - `DocumentResponse` 新增 `sourceStored` 和 `reprocessAvailable`。
  - 后端不返回 `source_bytes`、`source_text` 或任何原始正文内容。
- 前端接入：
  - Documents 列表和详情根据 `reprocessAvailable` 控制重试/重新处理入口。
  - 详情显示轻量“重试来源：已保存/未保存”。
  - 旧文档无来源不可重试时提示重新上传，不再让用户进入必然失败的流程。

### 不做

- 不做后台任务队列。
- 不做 OCR。
- 不做 PPT / Excel 解析。
- 不做 embedding / pgvector。
- 不做 SSE/流式输出。
- 不改变 Chat 引用来源规则；引用仍必须来自真实 chunks。

### 已完成内容

- 新增 Flyway 迁移 `V12__add_document_source_content.sql`，为 `documents` 增加原始来源字段。
- `DocumentTextExtractor` 支持从已持久化 bytes 重新解析文本，上传和重试共用同一套文件类型规则。
- 上传文档时保存原始 bytes；成功解析时保存规范化 `source_text`。
- 重新处理文档时按“原始 bytes -> source_text -> 旧 chunks fallback”的顺序选择来源。
- 普通列表/详情查询只返回来源存在性布尔值，避免把大文件 bytes 拉入 API 响应。
- `DocumentResponse` 新增 `sourceStored`、`reprocessAvailable`。
- 前端 `src/api/documents.ts` 类型已补充新字段，Documents 列表和详情会按可重试能力禁用入口并展示明确提示。

### 验收结果

- `cd backend && .\mvnw.cmd -Dtest=Stage16DocumentRetryTests test` 已通过，4 个阶段 16 测试全部成功。
- `cd backend && .\mvnw.cmd "-Dtest=Stage15DocumentQualityTests,Stage16DocumentRetryTests" test` 已通过，阶段 15/16 相关测试共 10 个全部成功。
- 全量后端测试、前端构建、目标 ESLint 和 `git diff --check` 见本轮最终验收记录。

## 阶段 15：知识库质量与文档处理增强

### 目标

阶段 15 不急着做 SSE、向量检索或 Agent 工作流，先解决 RAG 产品的下一层真实瓶颈：用户上传资料后，需要知道文档是否处理得好、为什么检索命中、哪些 chunk 可用、失败后如何重试，以及能否快速看到文档级摘要。

### 范围

- 文档处理质量可视化：
  - 展示文档 chunk 数、字符数、平均 chunk 长度、过短/过长/空内容等质量提示。
  - 文档详情页展示处理状态、失败原因、质量警告和最近更新时间。
- 文档重新处理：
  - 支持 `OWNER` / `EDITOR` 对已上传文档重新解析和重新切片。
  - 重新处理必须保留文档记录，替换旧 chunks，并保证失败时状态和错误信息清晰。
  - 第一版不保存原始文件二进制或原始存储路径，因此重新处理基于当前已有 chunks 重建文本；真正未生成 chunks 的失败上传会返回可理解的 `400` 错误并保持 `FAILED` 状态。
- 失败重试：
  - 对 `FAILED` 文档提供重试入口。
  - 当前版本仅支持已有 chunks 的文档重处理；无可重建 chunks 的失败上传仍需要后续“原始文件/原始文本持久化”阶段补齐真正重试。
- 文档摘要：
  - 支持按当前用户模型配置为单个文档生成简短摘要。
  - 摘要失败时错误脱敏，不暴露模型供应商敏感信息。
- 检索命中解释：
  - 搜索结果和 Chat 引用来源继续来自真实 chunks。
  - 前端展示命中文档、chunk 序号、分数和命中片段，让用户能判断回答依据是否可信。

### 不做

- 不做 SSE/流式输出。
- 不做 embedding / pgvector。
- 不做 OCR。
- 不做 PPT / Excel 解析。
- 不做后台任务队列系统。
- 不做复杂 Prompt 编排系统。
- 不恢复 `/KnowledgeBases/{id}` 的 Chat 入口。

### 验收标准

- 后端新增或调整接口同步 `doc/API.md`。
- 文档重新处理只允许 `OWNER` / `EDITOR`，`VIEWER` 返回 `403`，非成员返回 `404`。
- 重新处理成功后旧 chunks 被替换，检索和 Chat 引用使用新 chunks。
- 有 chunks 的文档可以重新处理；无 chunks 的失败文档返回明确 `400`，失败原因可见且不泄露敏感内部信息。
- 文档质量信息能帮助用户判断文档是否适合 RAG。
- 文档摘要使用当前用户自己的模型配置或后端兜底配置，错误继续脱敏。
- 前端通过 `src/api/` axios wrapper 接入，不新增直接 `fetch`、组件级 `localStorage` 或 mock-only 逻辑。
- 验证命令至少包括 `cd backend && .\mvnw.cmd test`、`pnpm build` 和目标 ESLint。

### 已完成内容

- 新增 `GET /api/documents/{documentId}/quality`，返回文档状态、chunk 数、字符数、平均/最短/最长 chunk 长度、质量提示和更新时间。
- 新增 `POST /api/documents/{documentId}/reprocess`，`OWNER` / `EDITOR` 可触发重新处理，`VIEWER` 返回 `403`，非成员返回 `404`。
- 重新处理会基于当前 chunks 重建文本，成功后在事务内删除旧 chunks 并写入新 chunks；替换失败时旧 chunks 回滚保留，再把文档状态写为 `FAILED`。
- 新增 `POST /api/documents/{documentId}/summary`，使用当前用户模型配置或环境兜底生成摘要，支持 `maxLength`，摘要保存到 `documents.summary`，不写入 `document_chunks` 或 Chat 引用来源。
- `DocumentResponse` 补充质量字段和摘要字段，Documents 页面、文档详情面板、知识库详情检索范围都展示质量信息。
- 前端质量提示将后端稳定 code 映射为中文短文案，不直接显示内部枚举码。

### 验收结果

- `cd backend && .\mvnw.cmd -Dtest=Stage15DocumentQualityTests test` 已通过，6 个阶段 15 测试全部成功。
- 阶段 15 全量验证见本轮最终验收记录：后端全量测试、前端构建、目标 ESLint 和 `git diff --check`。

## 阶段 14：Docker 化与运维 + do.md 收尾修复

### 目标

让项目从本地学习/演示状态收敛为可复现启动、可 Docker 化运行、可健康检查、可排查日志、可备份恢复数据库的交付状态；同时完成 `do.md` 中影响真实 Chat、Settings、Header 和响应式体验的问题修复说明收尾。

### 已完成内容

- README 已更新到阶段 14 当前真实状态，覆盖认证、知识库、协作权限、文档处理、全文检索、RAG、用户级模型配置、未读会话、今日交谈次数和 Docker 化能力。
- README 已补充本地开发启动命令：
  - `pnpm sql`
  - `pnpm backend`
  - `pnpm dev`
- README 已补充 Docker 全量启动流程：
  - 复制 `.env.example` 为 `.env`
  - 替换 PostgreSQL、JWT、模型加密等 secrets
  - `docker compose up -d --build`
  - 访问前端和后端健康检查
- README 已补充构建命令：
  - `pnpm build`
  - `cd backend && .\mvnw.cmd -DskipTests package`
- README 已补充环境变量表：
  - PostgreSQL
  - JWT
  - 用户模型 API Key 加密密钥
  - 可选 AI 兜底配置
  - 前端/后端/PostgreSQL 端口
  - 数据库连接池参数
- README 已补充健康检查、Swagger/OpenAPI 说明、Docker 日志排查、PostgreSQL 备份和恢复命令。
- `doc/PROJECT.md` 已更新为阶段 14 完成态，说明本地开发、Docker 全量运行、构建、健康检查和运维方式。
- `doc/BACKEND_TASK.md` 已更新为阶段 14 后端验收记录，不再保留“后续收尾重点”。
- `doc/FRONTEND_TASK.md` 已更新为阶段 14 前端验收记录，不再保留“后续收尾重点”。
- `do.md` 中列出的 Chat 模型选择、自动滚动、用户模型配置复用、Settings 模型测试、退出确认、引用来源跟随选中回答、未读角标和响应式问题，已按阶段 14 记录为代码级修复完成。
- 本轮新增 `do.md` 验收问题已完成：
  - Settings `Chat Model` 改为显式“可输入 + 下拉选择”控件，不再依赖不明显的 `input + datalist`。
  - Chat RAG 开关补充固定 hover 提示：开启时检索知识库片段并展示引用，关闭时只按当前会话和模型回答且不生成引用来源。
  - Chat 生成中禁用 RAG 开关和模型选择；发送按钮切换为“打断”，调用后端取消接口。
  - Chat 请求不再发送硬编码默认模型，避免绕开用户 Settings 或 `.env` 本地兜底配置。
  - 后端新增 `ragEnabled` 请求字段、`POST /api/chat/sessions/{sessionId}/cancel` 和 `active_generation_id` 防旧任务落库机制。
  - 后端支持本地 `pnpm backend` 从项目根目录或 `backend/` 目录 `.env` 读取 AI 兜底配置。

### 验收结果

- Docker 化和运维收尾文档已完成。
- `pnpm build` 已通过，只有 Vite 大 chunk 警告。
- 目标 ESLint 已通过：
  `pnpm eslint src/pages/Settings.tsx src/pages/Chat.tsx src/api/settings.ts src/api/chat.ts src/components/settings src/components/chat-page src/components/chat/ChatComposer.tsx src/components/MainHeader.tsx src/components/slider-sidebar.tsx`。
- `cd backend && .\mvnw.cmd -DskipTests package` 已通过。
- `cd backend && .\mvnw.cmd test` 已通过，71 个测试全部成功。
- `docker compose config` 已通过。
- `docker compose up -d --build` 已通过，PostgreSQL、backend、frontend 均成功启动。
- Compose 已验证关键 secrets 必须由 `.env` 或 `--env-file` 提供，缺少 `POSTGRES_PASSWORD`、`KNOWFLOW_JWT_SECRET` 或 `KNOWFLOW_MODEL_SECRET_KEY` 时会拒绝启动。
- 直接后端健康检查 `http://localhost:8080/api/health` 返回 `{"status":"UP"}`。
- 前端 Nginx 代理健康检查 `http://localhost:5173/api/health` 返回 `{"status":"UP"}`。
- browser-use 可见窗口已验证 Docker 前端可访问、空库注册登录可用、`/Settings` 可访问、`/Chat` 空状态可用、创建知识库后可进入 Chat 主界面。
- 未配置真实模型时在 Chat 发送“你好”返回脱敏提示 `Model settings are incomplete`，符合本阶段“不内置 mock 模型服务”的验收边界。
- 本轮收尾新增了 `ragEnabled` 和生成打断接口，`doc/API.md` 已同步更新。
- 阶段 14 标记为已完成。

### 剩余人工验收条件

完整 Chat 真实回答验收依赖用户提供真实、可用的模型配置：

1. 在 `/Settings` 保存有效的 OpenAI-compatible Base URL、API Key 和 Model。
2. 点击 Settings 模型测试，确认真实模型连接成功。
3. 进入 `/Chat/{sessionId}`，选择模型并发送问题。
4. 确认后端生成助手回答；有检索命中时显示引用来源，无检索命中时 `sources` 为空且不伪造引用。
5. 切换会话后确认后台生成完成会产生未读提醒，Header 未读角标只按 `unread === true` 统计。

如果没有真实模型配置，只能验收 Docker 启动、健康检查、接口可达、页面流程、空配置提示和错误脱敏。

## 历史阶段摘要

### 阶段 0：前端静态原型

完成 Dashboard、KnowledgeBases、Documents、Chat、Settings 主要页面静态原型。静态 mock 数据仅作为早期原型使用，后续阶段逐步替换为真实接口。

### 阶段 1：后端基础设施

建立 Spring Boot 后端、PostgreSQL、Flyway 和基础表结构。数据库结构变化通过新增 Flyway migration 管理，不修改已执行迁移。

### 阶段 2：认证闭环

完成注册、登录、JWT、重置密码、当前用户校验和前端登录接入。axios 自动携带 `Authorization: Bearer <accessToken>`。

### 阶段 3：知识库 CRUD

完成知识库列表、详情、创建、编辑、删除，按当前用户隔离。前端 KnowledgeBases 页面接入真实接口。

### 阶段 4：文档上传、解析、切片

完成知识库下文档上传、文本读取、切片、索引状态和文档列表/详情/删除接口。支持基础文本、Markdown、文本型 PDF。

### 阶段 5：文档检索 MVP

完成 `POST /api/knowledge-bases/{knowledgeBaseId}/search`，返回命中文档、chunk、内容和分数。前端知识库详情页提供检索测试区。

### 阶段 6：RAG 问答 MVP

完成会话、消息、检索、Prompt、模型调用、引用来源保存和前端 Chat 页面接入。`/KnowledgeBases/{id}` 保留文档检索测试区，不承载 Chat 入口。

### 阶段 7：前端体验完善

完成主要页面真实数据状态、加载/错误/空状态、页面组件拆分和代码级验证。浏览器 UI 验收由用户人工完成。

### 阶段 8：Settings 功能接入与交付整理

完成 Settings 后端接入，包括邮箱资料、RAG 参数、账号删除等功能，并同步项目交付说明。

### 阶段 9：检索质量升级

从普通关键词匹配升级到 PostgreSQL 全文检索，补充分数语义、相关度排序和 RAG 引用来源排序。

### 阶段 10：RAG 体验增强

补齐最近 6 条以内多轮上下文、空检索降级提示、引用片段展示和模型调用失败脱敏。

### 阶段 11：文档处理增强

新增 `.docx` 和 `.html/.htm` 文本提取。暂不支持 OCR、PPT、Excel 和后台队列。

### 阶段 12：权限与团队协作

新增 `knowledge_base_members`，支持单个知识库共享给已注册用户，角色为 `OWNER`、`EDITOR`、`VIEWER`。共享知识库不共享其他成员的 Chat 历史。

### 阶段 13：用户模型配置、偏好设置与多会话协同增强

完成用户级 OpenAI-compatible 模型配置、API Key 加密保存、动态模型列表、语言/时区偏好、未读会话、后台生成状态、今日交谈次数和 Chat 空检索真实回答。

## 暂不优先做

- Kubernetes。
- Spring Cloud 或微服务拆分。
- 向量索引后台重建任务和召回权重可配置。
- SSE 流式输出。
- 扫描版 PDF OCR。
- PPT / Excel 解析。
- 消息队列和复杂后台任务中心。
- 复杂组织权限和后台管理系统。
- Agent 工作流。

这些能力可作为后续扩展，但不阻塞当前 MVP 交付。
