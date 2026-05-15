# KnowFlow AI 阶段计划书

本文件是 KnowFlow AI 后续开发的权威阶段计划书。以后开发顺序、阶段状态和验收标准以这里为准；`ROADMAP.md` 只保留简版路线。

## 使用规则

- 每完成一个阶段，更新本文件的阶段状态和验收结果。
- 后端接口变化必须同步 `doc/API.md`。
- 开发命令、测试命令变化必须同步 `doc/DEVELOPMENT.md`。
- 项目当前状态变化必须同步 `doc/PROJECT.md`。
- 简版路线变化必须同步 `doc/ROADMAP.md`。
- 如果改变 Agent 协作规则，再同步 `AGENTS.md`。
- 后端学习阶段默认由用户自己写后端代码；AI 主要给文件清单、核心代码、必要注释和测试命令。
- 前端阶段默认由 AI 根据 `doc/API.md` 接入真实接口，遵守 axios、Zustand 和现有 UI 规范。

## 当前阶段总览

| 阶段 | 状态 | 依据 |
|---|---|---|
| 阶段 0：前端静态原型 | 已完成 | Dashboard、KnowledgeBases、Documents、Chat、Settings 静态页面相关提交 |
| 阶段 1：后端基础设施 | 已完成 | Spring Boot、PostgreSQL、Flyway、基础表结构 |
| 阶段 2：认证闭环 | 已完成 | 注册、登录、JWT、重置密码、前端登录接入 |
| 阶段 3：知识库 CRUD | 已完成 | 后端 CRUD、用户隔离、前端接真实接口、删除 mock 列表 |
| 阶段 4：文档上传、解析、切片 | 已完成 | Document 阶段按当前进度标记为已完成 |
| 阶段 5：文档检索 MVP | 已完成 | 后端关键词检索接口、前端检索测试区、文档同步和构建测试已完成 |
| 阶段 6：RAG 问答 MVP | 下一阶段 | 检索完成后再做；进入前先处理阶段间小功能 |
| 阶段 7：前端体验完善 | 未开始 | RAG 基础闭环后统一整理 |
| 阶段 8：项目交付整理 | 未开始 | README、演示账号、架构说明、答辩材料 |

## 阶段 0：前端静态原型

### 目标

完成主要页面的静态交互原型，让项目先具备可演示的前端骨架。

### 已完成内容

- Dashboard 首页统计卡片和入口。
- KnowledgeBases 列表、详情、交互原型。
- Documents 文档列表和分页原型。
- Chat 三栏问答界面原型。
- Settings 设置页原型。

### 验收标准

- 主要路由可以正常打开。
- 页面结构、导航、基础交互可演示。
- 静态 mock 数据只作为早期原型使用，后续阶段逐步删除。

### 涉及文档

- `doc/PROJECT.md`
- `doc/ROADMAP.md`

### 下一步

已完成。后续只在真实接口接入时清理遗留 mock 数据。

## 阶段 1：后端基础设施

### 目标

建立 Spring Boot 后端基础工程，接入 PostgreSQL 和 Flyway。

### 已完成内容

- Spring Boot 后端项目骨架。
- PostgreSQL Docker Compose 本地数据库。
- Flyway 数据库迁移。
- 基础表结构和 Maven 构建。

### 验收标准

- 后端可以启动。
- Flyway 可以初始化或升级数据库结构。
- Maven 测试可以运行。

### 涉及文档

- `doc/PROJECT.md`
- `doc/ARCHITECTURE.md`
- `doc/DEVELOPMENT.md`

### 下一步

已完成。后续数据库结构变化只通过新的 Flyway 迁移追加，不修改已落库迁移。

## 阶段 2：认证闭环

### 目标

完成注册、登录、JWT 和前端登录态闭环。

### 已完成内容

- 后端注册接口。
- 后端登录接口，成功后返回 JWT `accessToken`。
- 重置密码接口。
- Spring Security 基础配置。
- 前端 Login 页面接入真实后端接口。
- axios 请求自动携带 `Authorization`。
- Zustand 保存认证状态，`mock-auth.ts` 仅作为兼容层。

### 验收标准

- 用户可以注册并登录。
- 登录成功后访问受保护接口时携带 token。
- 未登录访问主应用会跳转登录页。
- 错误账号或密码不会进入主应用。

### 涉及文档

- `doc/API.md`
- `doc/PROJECT.md`
- `doc/DEVELOPMENT.md`
- `doc/ARCHITECTURE.md`

### 下一步

可在后续补 `GET /api/auth/me`，用于刷新后从后端确认当前用户。

## 阶段 3：知识库 CRUD

### 目标

完成知识库的真实后端 CRUD，并让前端知识库页面接入真实接口。

### 已完成内容

- 后端知识库列表、详情、创建、修改、删除接口。
- 知识库按 JWT 当前用户隔离。
- 知识库支持 `featured` 和 `themeId`。
- 前端 KnowledgeBases 页面通过 axios API wrapper 接入真实接口。
- 删除知识库列表主数据源里的静态 mock 数据。
- 加载、空状态、编辑、删除、登录失效跳转等状态。

### 验收标准

- 用户只能看到和操作自己的知识库。
- 前端可以创建、编辑、删除知识库。
- 删除后页面状态和后端数据一致。
- 未登录或 token 失效时跳转登录页。

### 涉及文档

- `doc/API.md`
- `doc/PROJECT.md`
- `doc/DEVELOPMENT.md`
- `doc/ROADMAP.md`

### 下一步

已完成。后续知识库详情页继续承载文档和检索入口。

## 阶段 4：文档上传、解析、切片

### 目标

完成知识库下的文档上传、文本读取、简单切片和索引状态流转。

### 已完成内容

- 文档上传接口。
- 文档列表、详情、删除接口。
- 文档 chunk 查询接口。
- 支持 TXT、Markdown、文本型 PDF 的第一版处理。
- 文档状态：`UPLOADED`、`PROCESSING`、`INDEXED`、`FAILED`。
- 按固定长度和 overlap 进行简单切片。
- 前端 Documents 页面和知识库详情页接入真实文档数据。

### 验收标准

- 用户可以在自己的知识库下上传支持格式的文档。
- 上传成功后文档最终进入 `INDEXED` 状态，并能查询 chunks。
- 不支持的文件类型、空白文本、超大文件、无法提取文本的 PDF 有明确错误。
- 删除文档时对应 chunks 被级联删除。
- 删除知识库时对应文档和 chunks 被级联删除。
- 不同用户不能访问彼此的文档。

### 涉及文档

- `doc/API.md`
- `doc/PROJECT.md`
- `doc/DEVELOPMENT.md`
- `doc/ARCHITECTURE.md`

### 下一步

进入阶段 5：文档检索 MVP。

## 阶段 5：文档检索 MVP

### 目标

在不接大模型的前提下，先完成可验证的文档 chunk 检索能力。

### 已完成内容

- 后端提供 `POST /api/knowledge-bases/{knowledgeBaseId}/search` 搜索接口。
- 搜索基于 `document_chunks.content` 做 PostgreSQL 普通关键词匹配。
- 搜索按 JWT 当前用户隔离知识库、文档和 chunks。
- 搜索只返回当前用户自己知识库下 `INDEXED` 文档的命中片段。
- 响应返回 `query`、`results`、命中文档名、chunk 序号、内容和 `score`。
- 前端新增 `searchKnowledgeBaseDocuments` API wrapper 和检索类型定义。
- 知识库详情页新增“文档检索测试区”，支持关键词、limit、搜索、清空、loading、空状态和错误状态。
- 前端大页面按功能拆分到 `src/components/*`，文档和知识库相关 UI 分别迁移到 `src/components/documents/*` 和 `src/components/knowledge-bases/*`。
- 同步更新 `doc/API.md`、`doc/PROJECT.md` 和 `doc/ROADMAP.md`。

### 验收标准

- 后端提供知识库内搜索接口。
- 搜索只检索当前登录用户自己的知识库和文档。
- 输入文档中存在的关键词时，返回匹配 chunks。
- 输入不存在的关键词时，返回空结果。
- 前端提供“检索测试区”，能展示命中文档、chunk 序号、内容和分数。

### 涉及文档

- `doc/API.md`
- `doc/DEVELOPMENT.md`
- `doc/PROJECT.md`
- `doc/ROADMAP.md`

### 下一步

阶段 5 已完成。阶段 6 是 RAG 问答 MVP，但进入阶段 6 前先处理阶段间小功能，不直接开始大模型问答。

默认接口：

```http
POST /api/knowledge-bases/{knowledgeBaseId}/search
```

请求体：

```json
{
  "query": "JWT 登录流程",
  "limit": 5
}
```

响应：

```json
{
  "query": "JWT 登录流程",
  "results": [
    {
      "chunkId": 1,
      "documentId": 2,
      "documentName": "note.md",
      "chunkIndex": 0,
      "content": "...",
      "score": 1.0
    }
  ]
}
```

第一版只做 PostgreSQL 普通关键词匹配，不上 embedding、不上 pgvector。检索接口稳定后，后续再进入 RAG Chat。

## 阶段 6：RAG 问答 MVP

### 目标

基于阶段 5 的检索结果，完成最小可用的知识库问答闭环。

### 已完成内容

未开始。

### 验收标准

- 用户可以在某个知识库内提问。
- 后端先检索相关 chunks，再把检索结果放入 prompt。
- 回答基于上传资料生成。
- 回答能展示引用来源。
- 会话和消息可以被保存和查询。

### 涉及文档

- `doc/API.md`
- `doc/PROJECT.md`
- `doc/DEVELOPMENT.md`
- `doc/ARCHITECTURE.md`

### 下一步

阶段 5 完成后再设计模型调用、prompt 结构、引用格式和会话存储。

## 阶段 7：前端体验完善

### 目标

在核心闭环跑通后，统一整理前端体验和页面一致性。

### 已完成内容

未开始。

### 验收标准

- 主要页面不再依赖误导性的 mock 文案。
- 加载、错误、空状态、删除确认、上传状态一致。
- 移动端和桌面端布局可用。
- 文档、检索、问答流程在前端连贯。

### 涉及文档

- `doc/PROJECT.md`
- `doc/ROADMAP.md`

### 下一步

RAG MVP 完成后再集中处理，不提前为未稳定的接口做大规模 UI 重构。

## 阶段 8：项目交付整理

### 目标

把项目整理成可以演示、答辩、交接和复现的状态。

### 已完成内容

未开始。

### 验收标准

- README 能指导新人启动项目。
- 有演示账号、启动命令、环境要求。
- 有架构说明和 RAG 流程说明。
- API 文档和实际接口一致。
- 可以清楚说明项目技术栈、模块边界和未来扩展方向。

### 涉及文档

- `README.md`
- `doc/README.md`
- `doc/PROJECT.md`
- `doc/ARCHITECTURE.md`
- `doc/API.md`
- `doc/DEVELOPMENT.md`

### 下一步

核心功能稳定后再做。

## 暂不优先做

- Spring Cloud。
- Kubernetes。
- 消息队列。
- 多服务独立数据库。
- 复杂权限系统。
- PDF OCR。
- Agent 工作流。
- 多租户组织权限。
- 复杂后台管理系统。

这些能力可以作为后续扩展，但不应该阻塞当前 MVP。

## 每阶段收尾检查

每个阶段完成后，按下面清单收尾：

- 功能是否达到本阶段验收标准。
- 后端接口是否同步 `doc/API.md`。
- 本地启动、测试、手工验证命令是否同步 `doc/DEVELOPMENT.md`。
- 当前项目状态是否同步 `doc/PROJECT.md`。
- 简版路线是否同步 `doc/ROADMAP.md`。
- 是否需要更新 `AGENTS.md` 的协作规则。
- 是否完成 git 提交，并在提交信息里分点写清楚功能变化。
