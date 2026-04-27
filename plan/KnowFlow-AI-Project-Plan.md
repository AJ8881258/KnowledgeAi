# KnowFlow AI 知识库问答平台项目计划书

> 项目目标：在 3 个月内完成一个可部署、可演示、可写进简历的全栈 + AI 应用项目，用于投递前端开发实习、全栈开发实习，并为后续转向 AI 应用开发 / RAG 工程方向做铺垫。

---

## 1. 项目定位

### 1.1 项目名称

**KnowFlow AI 知识库问答平台**

简历项目标题可写为：

> 基于 React + Node.js + PostgreSQL/pgvector 的智能知识库问答平台

### 1.2 项目一句话介绍

KnowFlow AI 是一个面向学生和开发者的智能资料问答平台，支持用户上传 PDF、Markdown、TXT 等学习资料或项目文档，系统自动完成文本解析、内容切分、向量化入库，并基于 RAG 技术实现带引用来源的 AI 问答。

### 1.3 求职定位

这个项目主要服务于以下实习方向：

- 前端开发实习生
- 全栈开发实习生
- Web 开发实习生
- AI 应用开发实习生
- RAG / LLM 应用开发实习生

项目重点不是展示“模型训练能力”，而是展示：

- 前端工程能力
- Node.js 后端开发能力
- 数据库设计能力
- 文件上传和处理能力
- RAG 应用落地能力
- 大模型 API 接入能力
- 项目部署和文档能力

### 1.4 项目价值

相比普通的博客、商城后台、学生管理系统，这个项目更适合当前实习竞争环境，因为它同时具备：

- 完整业务闭环：注册、登录、知识库、文档、问答、历史记录。
- 全栈能力体现：前端页面、后端接口、数据库、鉴权、文件处理。
- AI 应用亮点：Embedding、向量检索、RAG、流式输出、引用溯源。
- 面试可讲空间：可以围绕前端、后端、数据库、AI、部署分别展开。
- 后续扩展潜力：可以继续升级为 Agent、工作流、团队知识库、面试助手等。

---

## 2. 技术选型

### 2.1 前端技术栈

- React 19
- Vite 8
- TypeScript
- Tailwind CSS v4
- React Router
- Zustand 或 React Context
- Fetch API / Axios
- Server-Sent Events 或 fetch stream

选择理由：

- React + Vite 适合快速构建现代前端项目。
- TypeScript 能体现工程规范和类型意识。
- Tailwind CSS 适合快速做出简洁、统一、可维护的界面。
- React 生态更适合后续衔接 Next.js 和 AI 产品开发方向。

### 2.2 后端技术栈

- Node.js LTS
- Express
- TypeScript
- Zod
- JWT
- bcrypt
- multer
- pg
- dotenv
- pino 或 morgan

选择理由：

- Express 学习成本低，适合 3 个月内完成项目。
- Node.js 与前端技术栈衔接自然，适合全栈实习定位。
- TypeScript + Zod 能体现接口校验和类型约束。
- JWT + httpOnly Cookie 可以展示真实项目中的登录鉴权能力。

### 2.3 数据库与向量检索

- PostgreSQL
- pgvector

选择理由：

- PostgreSQL 是企业常用关系型数据库。
- pgvector 可以直接在 PostgreSQL 中存储和检索向量，避免额外部署 Qdrant、Milvus 等独立向量数据库。
- 对实习项目而言，PostgreSQL + pgvector 足够体现 RAG 检索能力和数据库设计能力。

### 2.4 AI 能力

- OpenAI-compatible Chat API
- OpenAI-compatible Embedding API
- 可兼容 OpenAI、DeepSeek、通义千问、硅基流动、火山方舟等服务

设计原则：

- 不把 API Key 放在前端。
- 后端统一封装 LLM Adapter。
- 通过环境变量配置模型服务。
- 项目不做模型训练，只做模型应用和 RAG 落地。

### 2.5 部署方案

本地开发：

- Docker Compose 启动 PostgreSQL + pgvector
- 前端本地 Vite Dev Server
- 后端本地 Express Dev Server

线上演示可选：

- 前端：Vercel / Netlify
- 后端：Render / Railway / Fly.io / 云服务器
- 数据库：Supabase / Neon / Railway PostgreSQL

---

## 3. 核心功能规划

### 3.1 用户系统

功能：

- 用户注册
- 用户登录
- 用户退出
- 获取当前用户信息
- 登录态保持
- 路由鉴权

实现要点：

- 密码使用 bcrypt 加密存储。
- 登录成功后后端签发 JWT。
- JWT 存放在 httpOnly Cookie 中。
- 前端通过 `/api/auth/me` 判断登录状态。
- 未登录用户访问业务页面时跳转到登录页。

面试可讲点：

- 为什么密码不能明文存储。
- JWT 和 Session 的区别。
- 为什么使用 httpOnly Cookie，而不是 localStorage。
- 前端路由守卫怎么做。
- Token 过期后如何处理。

### 3.2 知识库管理

功能：

- 创建知识库
- 查看知识库列表
- 查看知识库详情
- 编辑知识库名称和描述
- 删除知识库

示例：

- 前端面试资料库
- 考研英语资料库
- 毕业设计文档库
- 项目 README 知识库

实现要点：

- 每个知识库归属于一个用户。
- 用户只能访问自己的知识库。
- 删除知识库时，需要同时删除关联文档、chunk、会话记录。

面试可讲点：

- 数据库表之间的关联关系。
- 用户数据隔离如何实现。
- 删除知识库时如何处理关联数据。

### 3.3 文档上传与管理

功能：

- 上传 PDF / TXT / Markdown 文件
- 查看文档列表
- 查看文档状态
- 删除文档
- 查看文档 chunk 预览
- 重新索引文档

文档状态：

```text
uploaded   已上传，等待处理
processing 正在解析和向量化
ready      处理完成，可以问答
failed     处理失败
```

文件限制：

- 单文件最大 10MB。
- 第一版只支持 PDF、TXT、Markdown。
- 不支持图片 OCR。
- 不支持 Word 文档，后续可扩展。

实现要点：

- 前端使用上传组件展示上传进度和错误状态。
- 后端使用 multer 接收文件。
- 后端保存文件元信息到 `documents` 表。
- 上传后触发文档解析和索引流程。
- 如果处理失败，记录错误原因。

面试可讲点：

- 文件上传前端如何处理。
- 后端如何限制文件大小和类型。
- 文档处理为什么要设计状态字段。
- 解析失败如何反馈给用户。

### 3.4 文档解析与切分

功能：

- PDF 文本提取
- TXT 文本读取
- Markdown 文本读取
- 文本清洗
- 文档切分 chunk
- chunk 存储

默认切分策略：

- chunk 大小：约 800 中文字符。
- chunk overlap：约 120 字符。
- 优先按段落切分。
- 段落过长时再按固定长度切分。
- 空白文本、重复空行、无意义空格需要清理。

实现要点：

- 切分后的 chunk 保留 `chunk_index`。
- 每个 chunk 记录所属文档、知识库和用户。
- metadata 中可记录页码、标题、原始文件名等信息。

面试可讲点：

- RAG 为什么需要 chunk。
- chunk 太大和太小分别有什么问题。
- overlap 的作用是什么。
- 如何处理 PDF 解析质量差的问题。

### 3.5 Embedding 与向量入库

功能：

- 对每个 chunk 调用 Embedding API。
- 将 embedding 写入 PostgreSQL 的 pgvector 字段。
- 对 embedding 字段建立索引。
- 支持按问题向量进行相似度检索。

实现要点：

- embedding 维度必须固定。
- 数据库字段使用 `vector(n)`。
- 不同 embedding 模型的维度可能不同，不能混用。
- 第一版可以在项目环境变量中固定 embedding 模型。

推荐环境变量：

```env
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

如果使用其他模型，需要根据实际模型维度调整。

面试可讲点：

- embedding 是什么。
- 为什么向量可以用于语义检索。
- pgvector 如何做相似度查询。
- 为什么 embedding 维度要固定。
- 为什么选择 PostgreSQL + pgvector，而不是单独向量数据库。

### 3.6 RAG 问答

功能：

- 用户在某个知识库中提问。
- 系统生成问题 embedding。
- 从当前知识库中检索 top-k 相关 chunks。
- 将 chunks 拼接成上下文。
- 调用大模型生成回答。
- 返回回答内容和引用来源。

默认参数：

- topK = 6
- 最多展示 4 个引用来源
- 使用 cosine distance
- 如果没有可用文档或检索结果为空，提示资料不足

Prompt 基本结构：

```text
你是一个严谨的知识库问答助手。
请只基于提供的资料回答用户问题。
如果资料中没有答案，请明确说明“当前知识库资料不足，无法确定”。
回答时尽量结构清晰，必要时使用列表。

资料片段：
[1] 文档A - 片段内容...
[2] 文档B - 片段内容...

用户问题：xxx
```

实现要点：

- 不允许直接把用户问题裸传给模型。
- 必须先检索知识库片段。
- prompt 中要要求模型基于资料回答。
- 回答结果要附带引用来源。
- assistant 消息需要保存到数据库。

面试可讲点：

- RAG 的完整流程是什么。
- RAG 如何减少幻觉。
- 为什么还需要引用来源。
- 如果检索结果不相关怎么办。
- topK 如何选择。

### 3.7 流式回答

功能：

- 用户发送问题后，前端实时显示模型输出。
- 支持回答生成中的 loading 状态。
- 支持停止生成。
- 流结束后显示引用来源。

实现方式：

- 可使用 Server-Sent Events。
- 也可使用 fetch stream。
- 后端接收 LLM 流式响应后转发给前端。

实现要点：

- 前端需要维护当前 assistant 消息的临时状态。
- 流结束后再保存完整 assistant 消息或以后端保存为准。
- 发生错误时，要展示明确错误提示。

面试可讲点：

- 普通 HTTP 响应和流式响应的区别。
- 前端如何读取 stream。
- 如何处理生成过程中的取消操作。
- 流式输出对用户体验有什么提升。

### 3.8 历史会话

功能：

- 创建新会话
- 查看会话列表
- 查看历史消息
- 自动生成会话标题
- 删除会话，可选

实现要点：

- 每个会话属于一个知识库。
- 每条消息属于一个会话。
- 用户问题和 AI 回答都需要保存。
- AI 回答的引用来源保存在 `sources` 字段中。

面试可讲点：

- 聊天数据如何建表。
- 历史消息如何加载。
- 长会话如何控制上下文长度。

---

## 4. 页面规划

### 4.1 登录页 / 注册页

功能：

- 邮箱登录
- 密码登录
- 注册新账号
- 表单校验
- 错误提示

页面重点：

- 简洁、专业。
- 不需要做复杂营销页。
- 表单体验要完整。

### 4.2 Dashboard 首页

展示内容：

- 知识库数量
- 文档数量
- 最近知识库
- 最近会话
- 创建知识库按钮

页面目标：

- 让面试官一眼看到这是一个完整产品，而不是单页面 demo。

### 4.3 知识库列表页

功能：

- 展示所有知识库
- 创建知识库
- 搜索知识库
- 编辑知识库
- 删除知识库
- 进入知识库详情

### 4.4 知识库详情页

展示内容：

- 知识库名称和描述
- 文档列表
- 上传文档入口
- 文档处理状态
- 进入问答按钮

### 4.5 文档详情页

展示内容：

- 文件名
- 文件大小
- 文件类型
- 处理状态
- 错误信息
- chunk 数量
- chunk 预览
- 重新索引按钮

### 4.6 问答页

核心功能：

- 左侧会话列表
- 中间聊天区域
- 底部问题输入框
- 流式回答展示
- 引用来源卡片
- 点击引用查看 chunk 内容

页面重点：

- 这是整个项目最重要的页面。
- 要重点打磨交互体验和视觉层次。
- 面试演示主要围绕这个页面展开。

### 4.7 设置页

展示内容：

- 当前模型名称
- embedding 模型名称
- RAG 参数说明
- 项目版本信息

说明：

- 设置页可以不支持用户修改配置。
- 主要用于展示项目工程完整性。

---

## 5. 后端 API 规划

### 5.1 Auth API

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### 5.2 Knowledge Base API

```text
GET    /api/kbs
POST   /api/kbs
GET    /api/kbs/:kbId
PATCH  /api/kbs/:kbId
DELETE /api/kbs/:kbId
```

### 5.3 Document API

```text
POST   /api/kbs/:kbId/documents
GET    /api/kbs/:kbId/documents
GET    /api/documents/:documentId
DELETE /api/documents/:documentId
GET    /api/documents/:documentId/chunks
POST   /api/documents/:documentId/reindex
```

### 5.4 Chat API

```text
POST /api/kbs/:kbId/chat/sessions
GET  /api/kbs/:kbId/chat/sessions
GET  /api/chat/sessions/:sessionId/messages
POST /api/chat/sessions/:sessionId/messages
```

### 5.5 Health API

```text
GET /api/health
```

用途：

- 检查后端服务是否正常。
- 检查数据库连接是否正常。
- 部署时用于快速验证服务状态。

---

## 6. 数据库设计

### 6.1 users

```text
id
email
password_hash
name
created_at
```

### 6.2 knowledge_bases

```text
id
user_id
name
description
created_at
updated_at
```

### 6.3 documents

```text
id
kb_id
user_id
filename
mime_type
size
status
error_message
created_at
updated_at
```

### 6.4 document_chunks

```text
id
document_id
kb_id
user_id
chunk_index
content
token_estimate
embedding vector(固定维度)
metadata jsonb
created_at
```

### 6.5 chat_sessions

```text
id
kb_id
user_id
title
created_at
updated_at
```

### 6.6 chat_messages

```text
id
session_id
user_id
role
content
sources jsonb
created_at
```

### 6.7 ingestion_jobs

```text
id
document_id
status
error_message
started_at
finished_at
```

---

## 7. 项目目录结构

推荐使用 monorepo 结构：

```text
knowflow-ai/
  apps/
    web/
      src/
        app/
        components/
        features/
        hooks/
        lib/
        pages/
        styles/
    api/
      src/
        modules/
          auth/
          knowledge-bases/
          documents/
          ingestion/
          chat/
        shared/
        config/
        db/
        server.ts
  packages/
    shared/
      src/
        schemas/
        types/
  infra/
    docker-compose.yml
    postgres/
      init.sql
  docs/
    project-plan.md
    interview-notes.md
  README.md
```

---

## 8. 开发里程碑

### 第 1 周：项目初始化

目标：搭建项目骨架，让前后端和数据库都能跑起来。

任务：

- 创建 monorepo 项目结构。
- 初始化 React + Vite + TypeScript。
- 接入 Tailwind CSS。
- 初始化 Express + TypeScript。
- 配置 ESLint 和 Prettier。
- 配置环境变量。
- 编写 Docker Compose，启动 PostgreSQL + pgvector。
- 编写数据库初始化 SQL。
- 实现 `/api/health`。

验收标准：

- 前端页面可以打开。
- 后端服务可以启动。
- `/api/health` 返回正常。
- 数据库可以连接。
- README 中有本地启动说明。

### 第 2 周：用户系统和基础布局

目标：完成登录注册和基础产品界面。

任务：

- 实现注册接口。
- 实现登录接口。
- 实现退出接口。
- 实现获取当前用户接口。
- 前端完成登录页和注册页。
- 实现登录态管理。
- 实现路由守卫。
- 完成 Dashboard 基础布局。

验收标准：

- 用户可以注册。
- 用户可以登录。
- 刷新页面后登录态仍然存在。
- 未登录不能访问业务页面。
- 用户可以退出登录。

### 第 3 周：知识库和文档上传

目标：完成知识库管理和文件上传。

任务：

- 实现知识库 CRUD。
- 前端实现知识库列表页。
- 前端实现知识库详情页。
- 实现文档上传接口。
- 限制文件类型和大小。
- 前端实现上传组件。
- 展示文档列表和文档状态。

验收标准：

- 用户可以创建、编辑、删除知识库。
- 用户可以上传 PDF / TXT / Markdown。
- 上传后文档出现在列表中。
- 非法文件会显示明确错误。

### 第 4 周：文档解析和 chunk 切分

目标：完成文档从文件到文本片段的处理流程。

任务：

- 实现 TXT 解析。
- 实现 Markdown 解析。
- 实现 PDF 文本提取。
- 实现文本清洗。
- 实现 chunk 切分。
- 将 chunk 写入数据库。
- 实现 chunk 预览接口。
- 前端实现文档详情页和 chunk 预览。

验收标准：

- 上传文档后可以生成 chunks。
- 文档状态能从 processing 变为 ready。
- 文档详情页可以查看 chunk 预览。
- 解析失败时文档状态变为 failed，并展示错误原因。

### 第 5 周：Embedding 和向量检索

目标：完成 RAG 的检索基础。

任务：

- 封装 Embedding API。
- 对 chunk 生成 embedding。
- 将 embedding 写入 pgvector 字段。
- 实现相似度检索函数。
- 对问题生成 embedding。
- 检索 top-k 相关 chunks。
- 编写检索调试接口，仅开发环境启用。

验收标准：

- 文档 ready 后，每个 chunk 都有 embedding。
- 输入一个问题后，可以检索到相关 chunk。
- 检索结果包含文档名、chunk 内容、相似度分数。

### 第 6 周：RAG 问答闭环

目标：完成用户提问到 AI 回答的完整闭环。

任务：

- 实现会话创建接口。
- 实现消息保存。
- 实现 RAG prompt 构造。
- 调用 LLM 生成回答。
- 保存 assistant 消息。
- 返回引用来源。
- 前端实现基础问答页。

验收标准：

- 用户可以在知识库中创建会话。
- 用户可以提问。
- 系统可以根据知识库资料回答。
- 回答下方展示引用来源。
- 刷新页面后历史消息仍然存在。

### 第 7 周：流式输出和交互优化

目标：提升 AI 问答体验。

任务：

- 后端实现流式响应。
- 前端实现流式文字渲染。
- 实现生成中 loading 状态。
- 实现停止生成。
- 引用来源做成可点击卡片。
- 点击引用后展示对应 chunk 内容。
- 完善空状态和错误状态。

验收标准：

- AI 回答不是一次性出现，而是逐步输出。
- 用户可以看到生成中状态。
- 引用来源可以点击查看。
- API 出错时页面不会崩溃。

### 第 8 周：工程化和安全细节

目标：让项目更像真实工程，而不是 demo。

任务：

- 后端统一错误处理。
- 使用 Zod 做接口参数校验。
- 增加基础 rate limit。
- 增加请求日志。
- 统一前端 API 请求封装。
- 统一 loading 和 toast 提示。
- 清理上传文件策略。
- 补充 `.env.example`。

验收标准：

- 接口错误格式统一。
- 非法参数不会导致服务崩溃。
- 前端错误提示清晰。
- README 可以指导别人本地运行项目。

### 第 9 周：测试和部署

目标：让项目可以演示、可以验证。

任务：

- 编写 chunk 切分单元测试。
- 编写 prompt 构造单元测试。
- 编写鉴权中间件测试。
- 编写上传校验测试。
- 编写核心 API 集成测试。
- 部署前端。
- 部署后端。
- 部署数据库。
- 准备演示数据。

验收标准：

- 核心测试通过。
- 项目有线上访问地址。
- 演示账号可用。
- 可以完整演示上传资料和 AI 问答流程。

### 第 10-12 周：简历和面试打磨

目标：把项目转化为求职竞争力。

任务：

- 完善 README。
- 添加项目架构图。
- 添加 RAG 流程图。
- 录制 1-2 分钟演示视频。
- 整理项目难点文档。
- 整理面试问题和回答。
- 把项目写入简历。
- 根据投递反馈继续优化。

验收标准：

- 简历项目描述完整。
- 面试时能 10-15 分钟讲清楚项目。
- GitHub 仓库结构清晰。
- README 中有截图、启动方式、功能介绍、技术亮点。

---

## 9. 测试计划

### 9.1 单元测试

需要测试：

- `chunkText()`：短文本、长文本、空文本、中文段落、Markdown 标题。
- `buildRagPrompt()`：有上下文、无上下文、上下文过长。
- `validateUpload()`：非法类型、超大文件、空文件。
- `authMiddleware()`：无 cookie、无效 token、有效 token。

### 9.2 后端集成测试

需要测试：

- 注册登录后可以获取当前用户。
- 未登录不能访问知识库 API。
- 用户只能访问自己的知识库和文档。
- 上传文档后状态可以变为 ready。
- 文档 ready 后可以检索到相关 chunk。
- 提问后会保存用户消息和 assistant 消息。
- assistant 消息包含 sources。

### 9.3 前端 E2E 测试

需要测试：

- 用户注册登录。
- 创建知识库。
- 上传 Markdown 测试文档。
- 等待文档处理完成。
- 输入问题。
- 页面显示流式回答。
- 页面显示引用来源。
- 刷新后历史会话仍然存在。

### 9.4 人工验收场景

建议准备以下演示资料：

- 一份前端面试资料，询问“事件循环是什么”。
- 一份项目 README，询问“这个项目怎么启动”。
- 一份数据库笔记，询问“索引有什么作用”。
- 上传不相关资料后询问无关问题，系统应提示资料不足。
- 断开 LLM API Key，系统应展示清晰错误。

---

## 10. 简历写法

### 10.1 简历项目描述

```text
基于 React + Vite + TypeScript + Node.js + PostgreSQL/pgvector 实现智能知识库问答平台，支持用户上传 PDF/Markdown/TXT 文档，后端完成文本解析、chunk 切分、Embedding 向量化和相似度检索，并结合大模型生成带引用来源的流式回答。负责前端交互、后端 API、JWT 鉴权、数据库设计、RAG 流程实现和项目部署。
```

### 10.2 简历亮点 bullet

```text
- 设计并实现文档上传、解析、切分、向量化、检索、生成回答的完整 RAG 链路。
- 使用 PostgreSQL + pgvector 存储和检索文档向量，避免额外引入独立向量数据库，降低部署复杂度。
- 实现流式回答渲染和引用来源展示，提升 AI 问答体验和结果可解释性。
- 使用 JWT + httpOnly Cookie 实现登录鉴权，并在后端进行用户数据隔离。
- 使用 TypeScript 和 Zod 约束前后端数据结构，减少接口字段不一致问题。
- 通过 Docker Compose 提供本地开发环境，并完成项目部署和 README 文档编写。
```

### 10.3 技术栈写法

```text
前端：React、Vite、TypeScript、Tailwind CSS、React Router、组件化开发、流式渲染
后端：Node.js、Express、RESTful API、JWT、文件上传、Zod 参数校验
数据库：PostgreSQL、pgvector、SQL、索引、表关系设计
AI 应用：LLM API、Embedding、RAG、向量检索、Prompt 构造、引用溯源
工程化：Git、Docker Compose、环境变量管理、接口联调、项目部署
```

---

## 11. 面试讲解提纲

### 11.1 项目整体介绍

可以这样说：

```text
这个项目是一个智能知识库问答平台，用户可以上传自己的学习资料或项目文档。后端会对文档进行解析、切分和向量化，然后存入 PostgreSQL 的 pgvector 中。用户提问时，系统会先把问题转成向量，在当前知识库中检索相关片段，再把这些片段作为上下文交给大模型生成回答。前端会以流式输出的方式展示回答，并在回答下方展示引用来源。
```

### 11.2 为什么做这个项目

可以这样说：

```text
我不想只做普通的 CRUD 项目，所以选择做一个结合前端、后端、数据库和 AI 应用的全栈项目。这个项目既能体现 Web 开发基础，也能体现我对 RAG 和大模型应用落地的理解。
```

### 11.3 最核心的技术难点

可重点讲：

- 文档解析和切分。
- embedding 生成和维度统一。
- pgvector 相似度检索。
- RAG prompt 构造。
- 流式回答前端渲染。
- 引用来源展示。
- 用户数据隔离。

### 11.4 如果面试官问“这个项目和普通 ChatGPT 套壳有什么区别”

可以这样回答：

```text
普通套壳聊天通常只是把用户问题直接发给模型，而这个项目会先把用户上传的资料解析成文本片段，再生成向量存储。用户提问时，系统会先从知识库中检索相关内容，再让模型基于这些内容回答，并展示引用来源。所以它解决的是“基于用户私有资料问答”的问题，而不是单纯调用大模型接口。
```

### 11.5 如果面试官问“RAG 如何减少幻觉”

可以这样回答：

```text
RAG 通过检索外部知识库，把相关资料片段放入 prompt 中，让模型基于给定资料回答，而不是完全依赖模型参数中的记忆。同时我在 prompt 中要求模型只基于资料回答，如果资料不足就明确说明，并在前端展示引用来源。这样可以降低模型编造答案的概率，也方便用户检查回答依据。
```

### 11.6 如果面试官问“为什么选择 pgvector”

可以这样回答：

```text
这个项目的数据规模不大，主要用于实习项目和中小型知识库场景。PostgreSQL 本身可以存业务数据，pgvector 又能存储和检索向量，这样可以减少系统组件数量，降低部署复杂度。相比单独部署 Qdrant 或 Milvus，PostgreSQL + pgvector 更适合当前项目阶段。
```

---

## 12. 风险与取舍

### 12.1 最大风险：范围过大

风险：

- 如果同时做复杂 UI、复杂后端、复杂 AI、复杂部署，3 个月可能做不完。

应对：

- 先完成 MVP。
- 第一版只支持 PDF / TXT / Markdown。
- 第一版不做团队协作。
- 第一版不做复杂 Agent。
- 第一版不做模型训练。

### 12.2 AI API 不稳定或费用问题

风险：

- 模型 API 可能限额、变慢、收费。

应对：

- 抽象 LLM Adapter。
- 支持 OpenAI-compatible API。
- 可以切换不同供应商。
- 开发环境准备 mock 模型响应。

### 12.3 PDF 解析效果不稳定

风险：

- 某些 PDF 是扫描件，无法直接提取文本。

应对：

- 第一版明确不支持 OCR。
- 解析不到文本时展示错误提示。
- 演示时使用可复制文本的 PDF。

### 12.4 向量维度不一致

风险：

- 切换 embedding 模型后，向量维度不同，导致数据库写入失败。

应对：

- 环境变量固定 embedding 模型和维度。
- README 中说明切换模型需要重建向量表或重新索引。

### 12.5 项目做完但不会讲

风险：

- 只会跑项目，但面试讲不清楚。

应对：

- 第 10-12 周专门准备 README、演示视频和面试讲解稿。
- 每个技术点都准备“为什么这么做”和“有什么替代方案”。

---

## 13. 最小可行版本 MVP

如果时间紧，必须优先完成以下功能：

```text
1. 注册 / 登录
2. 创建知识库
3. 上传 Markdown / TXT 文档
4. 文档切分
5. Embedding 入库
6. 向量检索
7. RAG 问答
8. 引用来源展示
9. 历史消息
10. README 和部署说明
```

可以暂缓的功能：

```text
1. PDF 支持
2. 停止生成
3. 重新索引
4. 设置页
5. E2E 测试
6. 复杂美化
7. 会话标题自动生成
```

---

## 14. 最终交付物

项目完成时应包含：

- GitHub 仓库
- 前端源码
- 后端源码
- 数据库初始化脚本
- Docker Compose 配置
- `.env.example`
- README
- 项目架构图
- RAG 流程图
- 在线演示地址
- 演示账号
- 演示视频
- 面试讲解文档
- 简历项目描述

---

## 15. 推荐执行顺序

不要从 UI 美化开始，也不要一开始就纠结模型效果。

推荐顺序：

```text
1. 先跑通前端、后端、数据库
2. 再完成登录注册
3. 再完成知识库和文档上传
4. 再完成文档切分
5. 再完成 embedding 和向量检索
6. 再完成 RAG 回答
7. 再做流式输出和引用展示
8. 最后做 UI 打磨、测试、部署、简历包装
```

核心原则：

> 先让项目完整跑通，再逐步提高质量。不要一开始追求完美 UI 或复杂架构。

---

## 16. 学习重点配套

为了完成这个项目，需要同步补以下知识：

### 前端

- React Hooks
- TypeScript 泛型和接口
- React Router
- 表单校验
- 文件上传
- fetch stream / SSE
- 状态管理
- Tailwind CSS
- 响应式布局

### 后端

- Express 路由和中间件
- RESTful API 设计
- JWT 鉴权
- Cookie 安全
- multer 文件上传
- Zod 参数校验
- 统一错误处理
- 环境变量管理

### 数据库

- PostgreSQL 基础 SQL
- 表关联
- 外键
- 索引
- JSONB
- pgvector
- 相似度查询

### AI 应用

- LLM API 调用
- Embedding
- RAG
- Prompt 构造
- topK 检索
- 引用溯源
- token 成本
- 幻觉问题

---

## 17. 结论

这个项目适合作为 3 个月找实习前的主项目。它不是纯前端 demo，也不是难度过高的算法项目，而是一个贴近当前市场需求的全栈 AI 应用项目。

如果能按计划完成 MVP，并补齐 README、部署、演示视频和面试讲解，这个项目足够支撑前端 / 全栈实习面试中的项目部分。

最终目标不是证明自己会训练大模型，而是证明自己具备：

- 能独立搭建完整 Web 项目
- 能设计前后端接口和数据库
- 能接入 AI 能力并落地到真实产品
- 能理解 RAG 的基本工程流程
- 能把项目部署、演示、讲清楚

这正好符合你当前“先找前端或全栈实习，后续再转 AI 应用方向”的路线。
