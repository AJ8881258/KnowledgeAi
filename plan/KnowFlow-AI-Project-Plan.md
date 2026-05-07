# KnowFlow AI 知识库问答平台项目计划书

> 项目目标：在 3 个月内完成一个可部署、可演示、可写进简历的全栈 + AI 应用项目。前端保持 React 技术栈，后端调整为 Java Spring Boot 轻基础设施完整微服务方案，用于投递前端开发实习、Java 后端实习、Java 全栈实习，并为后续转向 AI 应用开发 / RAG 工程方向做铺垫。

---

## 1. 项目定位

### 1.1 项目名称

**KnowFlow AI 知识库问答平台**

简历项目标题可写为：

> 基于 React + Spring Boot 微服务 + PostgreSQL/pgvector 的智能知识库问答平台

### 1.2 项目一句话介绍

KnowFlow AI 是一个面向学生和开发者的智能资料问答平台，支持用户上传 PDF、Markdown、TXT 等学习资料或项目文档。系统后端由多个 Spring Boot 服务组成，分别负责用户鉴权、知识库管理、文档处理、RAG 检索问答和历史会话，并通过 Nginx 统一暴露 `/api/**` 接口。系统会自动完成文本解析、内容切分、向量化入库，并基于 RAG 技术实现带引用来源的 AI 问答。

### 1.3 求职定位

这个项目主要服务于以下实习方向：

- 前端开发实习生
- Java 后端开发实习生
- Java 全栈开发实习生
- Web 开发实习生
- 微服务后端开发实习生
- AI 应用开发实习生
- RAG / LLM 应用开发实习生

项目重点不是展示“模型训练能力”，而是展示：

- 前端工程能力
- Spring Boot 后端开发能力
- MyBatis 数据访问能力
- REST API 设计能力
- 微服务拆分和服务边界设计能力
- Docker Compose 本地编排能力
- PostgreSQL/pgvector 数据库设计能力
- 文件上传和处理能力
- RAG 应用落地能力
- 大模型 API 接入能力
- 项目部署和文档能力

### 1.4 项目价值

相比普通的博客、商城后台、学生管理系统，这个项目更适合当前实习竞争环境，因为它同时具备：

- 完整业务闭环：注册、登录、知识库、文档、问答、历史记录。
- 全栈能力体现：前端页面、Java 后端接口、数据库、鉴权、文件处理。
- 微服务展示空间：auth、kb、document、rag、chat 多服务按业务能力拆分。
- AI 应用亮点：Embedding、向量检索、RAG、流式输出、引用溯源。
- 面试可讲空间：可以围绕前端、Java、微服务、数据库、AI、部署分别展开。
- 后续扩展潜力：可以继续升级为 Spring Cloud、消息队列、团队知识库、Agent 工作流等。

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

前端文档参考：

- [React 文档](https://react.dev/)
- [Vite 文档](https://vite.dev/guide/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [React Router 文档](https://reactrouter.com/)
- [Zustand 文档](https://zustand.docs.pmnd.rs/)
- [shadcn/ui 组件文档](https://ui.shadcn.com/docs/components)

选择理由：

- React + Vite 适合快速构建现代前端项目。
- TypeScript 能体现工程规范和类型意识。
- Tailwind CSS 适合快速做出简洁、统一、可维护的界面。
- React 生态更适合后续衔接 Next.js 和 AI 产品开发方向。
- 前端继续使用 `/api/**` 路径访问后端，由 Nginx Gateway 转发到具体服务，减少前端对微服务拆分的感知。

### 2.2 后端技术栈

- Java 21
- Spring Boot 3.5.x
- Spring Web MVC
- Spring Security
- MyBatis Spring Boot Starter 3.0.x
- PostgreSQL JDBC Driver
- Flyway
- springdoc-openapi
- JWT
- BCrypt
- Apache PDFBox
- Maven
- Docker Compose

后端与基础设施文档参考：

- [Java 21 文档](https://docs.oracle.com/en/java/javase/21/)
- [Spring Boot 文档](https://docs.spring.io/spring-boot/3.5/reference/)
- [Spring Web MVC 文档](https://docs.spring.io/spring-framework/reference/web/webmvc.html)
- [Spring Security 文档](https://docs.spring.io/spring-security/reference/)
- [MyBatis Spring Boot Starter 文档](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)
- [PostgreSQL JDBC Driver 文档](https://jdbc.postgresql.org/documentation/)
- [Flyway 文档](https://documentation.red-gate.com/fd)
- [springdoc-openapi 文档](https://springdoc.org/)
- [Apache PDFBox 文档](https://pdfbox.apache.org/)
- [Maven 文档](https://maven.apache.org/guides/)
- [Docker Compose 文档](https://docs.docker.com/compose/)

- 依赖
- Spring Web 写 REST API
- Spring Security 登录、权限、接口保护
- OAuth2 Resource Server Bearer Token / JWT 鉴权
- Spring Data JPA 操作数据库，先快速做 CRUD
- PostgreSQL Driver 连接 PostgreSQL
- Flyway Migration 管理数据库表结构版本
- Validation 参数校验，比如用户名不能为空
- Lombok 减少 getter/setter/constructor 样板代码
- DevTools 开发热重启
- Docker Compose Support 后面用 Docker 启动 PostgreSQL 更方便

版本依据：

- 项目统一使用 Java 21 作为开发和运行基准。
- Spring Boot 3.x 官方系统要求至少 Java 17，因此 Java 21 满足 Spring Boot 3.5.x 要求。
- MyBatis Spring Boot Starter 官方兼容表显示 3.0.x 支持 Spring Boot 3.2 - 3.5 和 Java 17+，因此 Java 21 满足要求。
- 参考资料：
  - [Spring Boot System Requirements](https://docs.enterprise.spring.io/spring-boot/system-requirements.html)
  - [MyBatis Spring Boot Starter](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)

选择理由：

- Spring Boot 是 Java 后端实习和企业开发中最常见的技术栈。
- MyBatis 学习成本低，适合当前阶段掌握 SQL、Mapper、事务和数据库访问。
- Spring Security + JWT 可以展示真实项目中的登录鉴权能力。
- Flyway 用于管理数据库初始化和迁移，避免手动维护 SQL。
- springdoc-openapi 可以生成接口文档，方便前后端联调。
- Maven 单服务结构比一开始使用复杂多模块更容易理解和推进。

### 2.3 微服务基础设施

本项目采用“完整业务服务拆分 + 轻基础设施”的微服务方案。

第一版不使用：

- Spring Cloud
- Nacos / Eureka 注册中心
- Kubernetes
- 消息队列
- 每服务独立数据库
- 付费云服务

第一版使用：

- 多个独立 Spring Boot 服务进程。
- Docker Compose 启动 PostgreSQL/pgvector、Nginx 和各 Java 服务。
- Nginx 作为统一 Gateway，对外暴露 `/api/**`。
- 服务间通过 HTTP + Docker Compose 服务名通信。
- 环境变量管理服务端口、数据库连接、JWT 密钥、LLM API 配置。

基础设施与数据库文档参考：

- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [pgvector 文档](https://github.com/pgvector/pgvector)
- [Nginx 文档](https://nginx.org/en/docs/)
- [Nginx 反向代理文档](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Docker Compose 文档](https://docs.docker.com/compose/)

这样既能体现微服务拆分和独立部署，又不会一开始陷入注册中心、配置中心、链路追踪、K8s 等高成本基础设施。

### 2.4 微服务拆分

第一版拆分为 6 个服务：

```text
auth-service      用户注册、登录、JWT、当前用户
kb-service        知识库 CRUD
document-service  文件上传、文档记录、文本解析、chunk 切分
rag-service       Embedding、pgvector 检索、RAG prompt、LLM 调用、流式回答
chat-service      会话和消息历史
nginx-gateway     统一 /api/** 入口，按路径转发到各服务
```

服务边界原则：

- 按业务能力拆分，而不是按 Controller、Service、Mapper 这种技术层拆分。
- 每个 Spring Boot 服务可以独立启动、独立配置、独立健康检查。
- 每个服务只直接访问自己负责的数据库 schema。
- 跨服务数据读取优先通过 HTTP API，不直接跨 schema 查询。
- 为了简化第一版开发，可以冗余 `user_id`、`kb_id` 等必要字段，用于权限校验和查询过滤。

### 2.5 数据库与向量检索

- PostgreSQL
- pgvector
- 共享 PostgreSQL 实例
- 按服务边界划分 schema

选择理由：

- PostgreSQL 是企业常用关系型数据库。
- pgvector 可以直接在 PostgreSQL 中存储和检索向量，避免额外部署 Qdrant、Milvus 等独立向量数据库。
- 对实习项目而言，PostgreSQL + pgvector 足够体现 RAG 检索能力和数据库设计能力。
- 第一版不做每个服务一个数据库，避免本地部署和迁移复杂度过高。
- 通过 schema 隔离体现服务边界，比物理数据库隔离更适合当前学习阶段。

数据库 schema 规划：

```text
auth  用户表
kb    知识库表
doc   文档和 chunk 表
rag   embedding、检索相关表或视图
chat  会话和消息表
```

### 2.6 AI 能力

- OpenAI-compatible Chat API
- OpenAI-compatible Embedding API
- 可兼容 OpenAI、DeepSeek、通义千问、硅基流动、火山方舟等服务

第一版 Java 实现方式：

- 不把 API Key 放在前端。
- `rag-service` 统一封装 LLM Adapter。
- 通过环境变量配置模型服务。
- 第一版使用 Spring `RestClient` 或 `WebClient` 调用 Chat / Embedding API。
- 暂不引入 Spring AI，降低学习成本和依赖复杂度。
- 项目不做模型训练，只做模型应用和 RAG 落地。

### 2.7 部署方案

本地开发：

- Docker Compose 启动 PostgreSQL + pgvector
- Docker Compose 启动 Nginx Gateway
- 各 Spring Boot 服务本地运行或容器运行
- 前端本地 Vite Dev Server

线上演示可选：

- 前端：Vercel / Netlify
- 后端：云服务器 + Docker Compose
- 数据库：云服务器自建 PostgreSQL/pgvector 或免费 PostgreSQL 服务

第一版优先保证本地完整演示，不强制上线所有微服务。

---

## 3. 核心功能规划

### 3.1 用户系统

归属服务：`auth-service`

功能：

- 用户注册
- 用户登录
- 用户退出
- 获取当前用户信息
- 登录态保持
- 路由鉴权

实现要点：

- 密码使用 BCrypt 加密存储。
- 登录成功后 `auth-service` 签发 JWT。
- JWT 优先存放在 httpOnly Cookie 中。
- 前端通过 `/api/auth/me` 判断登录状态。
- Nginx 将 `/api/auth/**` 转发到 `auth-service`。
- 其他服务通过 JWT 解析或调用 `auth-service` 获取当前用户信息。
- 未登录用户访问业务页面时跳转到登录页。

面试可讲点：

- 为什么密码不能明文存储。
- JWT 和 Session 的区别。
- 为什么使用 httpOnly Cookie，而不是 localStorage。
- Spring Security 的过滤器链如何处理认证。
- 微服务中如何传递用户身份。
- Token 过期后如何处理。

### 3.2 知识库管理

归属服务：`kb-service`

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
- `kb-service` 只直接访问 `kb` schema。
- 删除知识库时，需要通知或调用 `document-service`、`chat-service` 清理关联数据。
- 第一版也可以采用“先删除知识库，再由相关服务按 `kb_id` 清理”的同步 HTTP 调用方式。

面试可讲点：

- 数据库表之间的关联关系。
- 微服务中如何处理跨服务关联数据。
- 用户数据隔离如何实现。
- 删除知识库时如何处理关联数据。

### 3.3 文档上传与管理

归属服务：`document-service`

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
processing 正在解析和切分
ready      处理完成，可以向量化和问答
failed     处理失败
```

文件限制：

- 单文件最大 10MB。
- 第一版优先支持 TXT、Markdown。
- PDF 支持可以作为第二阶段功能。
- 不支持图片 OCR。
- 不支持 Word 文档，后续可扩展。

实现要点：

- 前端使用上传组件展示上传进度和错误状态。
- 后端使用 Spring MVC `MultipartFile` 接收文件。
- 使用 `jakarta.validation` 做参数校验。
- 后端保存文件元信息到 `doc.documents` 表。
- 上传后触发文档解析和 chunk 切分流程。
- 第一版可以同步处理或使用简单异步线程，不引入消息队列。
- 如果处理失败，记录错误原因。

面试可讲点：

- 文件上传前端如何处理。
- Spring Boot 如何接收 multipart 文件。
- 后端如何限制文件大小和类型。
- 文档处理为什么要设计状态字段。
- 解析失败如何反馈给用户。

### 3.4 文档解析与切分

归属服务：`document-service`

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

- TXT / Markdown 第一版使用普通文本读取。
- PDF 第二阶段使用 Apache PDFBox 提取文本。
- 切分后的 chunk 保留 `chunk_index`。
- 每个 chunk 记录所属文档、知识库和用户。
- metadata 中可记录页码、标题、原始文件名等信息。
- chunk 写入 `doc.document_chunks`，embedding 字段由 `rag-service` 生成后更新或写入。

面试可讲点：

- RAG 为什么需要 chunk。
- chunk 太大和太小分别有什么问题。
- overlap 的作用是什么。
- 如何处理 PDF 解析质量差的问题。
- document-service 和 rag-service 的职责如何划分。

### 3.5 Embedding 与向量入库

归属服务：`rag-service`

功能：

- 从 `document-service` 获取待向量化 chunks。
- 对每个 chunk 调用 Embedding API。
- 将 embedding 写入 PostgreSQL 的 pgvector 字段。
- 对 embedding 字段建立索引。
- 支持按问题向量进行相似度检索。

实现要点：

- embedding 维度必须固定。
- 数据库字段使用 `vector(n)`。
- 不同 embedding 模型的维度可能不同，不能混用。
- 第一版可以在项目环境变量中固定 embedding 模型。
- `rag-service` 可以直接访问 `doc.document_chunks` 的 embedding 字段，或在 `rag` schema 建立向量表。为了降低复杂度，第一版建议 embedding 字段保留在 `doc.document_chunks`，但只由 `rag-service` 写入。

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
- 微服务中为什么把 RAG 能力独立成 `rag-service`。

### 3.6 RAG 问答

归属服务：`rag-service`

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
- `rag-service` 生成回答后调用 `chat-service` 保存 assistant 消息。

面试可讲点：

- RAG 的完整流程是什么。
- RAG 如何减少幻觉。
- 为什么还需要引用来源。
- 如果检索结果不相关怎么办。
- topK 如何选择。
- RAG 服务如何和 chat-service 协作。

### 3.7 流式回答

归属服务：`rag-service`

功能：

- 用户发送问题后，前端实时显示模型输出。
- 支持回答生成中的 loading 状态。
- 支持停止生成。
- 流结束后显示引用来源。

实现方式：

- 使用 Server-Sent Events。
- Nginx 需要关闭或调整响应缓冲，避免 SSE 被缓存后一次性返回。
- `rag-service` 接收 LLM 流式响应后转发给前端。

推荐 API：

```text
POST /api/chat/sessions/:sessionId/messages/stream
Content-Type: application/json
Accept: text/event-stream
```

实现要点：

- 前端需要维护当前 assistant 消息的临时状态。
- `rag-service` 生成过程中可以调用 `chat-service` 保存用户消息。
- 流结束后再保存完整 assistant 消息，或以后端保存为准。
- 发生错误时，要展示明确错误提示。

面试可讲点：

- 普通 HTTP 响应和流式响应的区别。
- SSE 和 fetch stream 的区别。
- Spring Boot 如何返回 `text/event-stream`。
- 如何处理生成过程中的取消操作。
- 流式输出对用户体验有什么提升。

### 3.8 历史会话

归属服务：`chat-service`

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
- `chat-service` 只直接访问 `chat` schema。

面试可讲点：

- 会话和消息如何建模。
- AI 回答为什么要保存引用来源。
- 微服务中 chat-service 是否需要了解 RAG 内部细节。

### 3.9 服务职责边界

为了避免后续开发混乱，第一版按以下规则划分职责：

```text
auth-service:
  只关心用户、密码、JWT、当前用户身份。

kb-service:
  只关心知识库本身，不处理文件解析和问答。

document-service:
  只关心文件、文档状态、文本解析、chunk 切分。

rag-service:
  只关心 embedding、向量检索、prompt、模型调用、流式输出。

chat-service:
  只关心会话、消息、引用来源持久化。

nginx-gateway:
  只关心路径转发，不承载业务逻辑。
```

---

## 4. 页面规划

### 4.1 登录页 / 注册页

功能：

- 用户登录
- 用户注册
- 表单校验
- 错误提示
- 登录成功后跳转 Dashboard

页面重点：

- 简洁清晰。
- 不需要复杂动画。
- 输入框、按钮、错误提示状态完整。

### 4.2 Dashboard 首页

功能：

- 展示知识库数量
- 展示文档数量
- 展示最近会话
- 展示最近上传文档

页面重点：

- 作为项目首页，体现产品完整度。
- 第一版可以使用静态统计或后端接口返回统计。

### 4.3 知识库列表页

功能：

- 展示知识库列表
- 创建知识库
- 编辑知识库
- 删除知识库
- 空状态

页面重点：

- 用户进入业务流程的起点。
- 卡片或表格均可。
- 创建知识库操作要明显。

### 4.4 知识库详情页

功能：

- 展示知识库基本信息
- 展示文档列表
- 上传文档入口
- 进入问答页入口

页面重点：

- 连接知识库、文档、问答三个核心模块。

### 4.5 文档详情页

功能：

- 展示文档元信息
- 展示文档处理状态
- 展示 chunk 预览
- 重新索引按钮

页面重点：

- 体现文档解析和 RAG 处理流程。
- 让面试官能看到“文档不是只上传了，而是真的被处理了”。

### 4.6 问答页

功能：

- 会话列表
- 当前会话消息
- 输入问题
- AI 流式回答
- 引用来源展示
- 点击引用查看 chunk 内容

页面重点：

- 面试演示主要围绕这个页面展开。
- 需要重点打磨交互体验。

### 4.7 设置页

功能：

- 显示当前用户信息
- 显示模型配置状态
- 显示后端服务健康状态，可选

说明：

- 设置页可以不支持用户修改配置。
- 主要用于展示项目工程完整性。

---

## 5. 后端 API 规划

前端统一访问 `/api/**`，Nginx Gateway 根据路径转发到对应服务。前端不需要知道具体服务端口。

统一错误格式：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "请求参数不合法",
  "details": {}
}
```

认证策略：

- 第一版建议使用 JWT + httpOnly Cookie。
- 前端请求业务接口时自动携带 Cookie。
- 各服务通过统一 JWT 密钥校验用户身份。
- 如果后续改为 Authorization Header，也应保持 API 路径不变。

### 5.1 Auth API

归属服务：`auth-service`

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### 5.2 Knowledge Base API

归属服务：`kb-service`

```text
GET    /api/kbs
POST   /api/kbs
GET    /api/kbs/:kbId
PATCH  /api/kbs/:kbId
DELETE /api/kbs/:kbId
```

### 5.3 Document API

归属服务：`document-service`

```text
POST   /api/kbs/:kbId/documents
GET    /api/kbs/:kbId/documents
GET    /api/documents/:documentId
DELETE /api/documents/:documentId
GET    /api/documents/:documentId/chunks
POST   /api/documents/:documentId/reindex
```

### 5.4 Chat API

归属服务：

- `chat-service`：会话和历史消息。
- `rag-service`：生成回答和流式输出。

```text
POST /api/kbs/:kbId/chat/sessions
GET  /api/kbs/:kbId/chat/sessions
GET  /api/chat/sessions/:sessionId/messages
POST /api/chat/sessions/:sessionId/messages
POST /api/chat/sessions/:sessionId/messages/stream
```

说明：

- `POST /api/chat/sessions/:sessionId/messages` 用于非流式回答，便于第一版调试。
- `POST /api/chat/sessions/:sessionId/messages/stream` 用于 SSE 流式回答，返回 `text/event-stream`。

### 5.5 Health API

归属服务：所有 Spring Boot 服务 + Nginx Gateway

```text
GET /api/health
GET /api/auth/health
GET /api/kbs/health
GET /api/documents/health
GET /api/chat/health
GET /api/rag/health
```

用途：

- 检查 Nginx Gateway 是否正常。
- 检查各 Spring Boot 服务是否正常。
- 检查数据库连接是否正常。
- 部署时用于快速验证服务状态。

---

## 6. 数据库设计

### 6.1 数据库初始化

第一版使用同一个 PostgreSQL 实例，按服务边界拆 schema：

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS kb;
CREATE SCHEMA IF NOT EXISTS doc;
CREATE SCHEMA IF NOT EXISTS rag;
CREATE SCHEMA IF NOT EXISTS chat;
```

迁移方式：

- 使用 Flyway 管理数据库初始化和变更。
- 每个服务维护自己的 migration。
- 第一版可以由各服务启动时执行自己 schema 下的 migration。
- 不要求第一版做到每个服务一个物理数据库。

服务访问边界：

- `auth-service` 只访问 `auth` schema。
- `kb-service` 只访问 `kb` schema。
- `document-service` 只访问 `doc` schema。
- `rag-service` 负责向量生成和检索，可以写入 `doc.document_chunks.embedding` 或维护 `rag` schema 中的向量表。
- `chat-service` 只访问 `chat` schema。

### 6.2 auth.users

```text
id
email
password_hash
name
created_at
```

建议约束：

- `id` 使用 UUID 或 bigserial。
- `email` 唯一。
- `password_hash` 不允许为空。

### 6.3 kb.knowledge_bases

```text
id
user_id
name
description
created_at
updated_at
```

说明：

- `user_id` 来源于 `auth-service`。
- 不强制跨 schema 外键，避免服务耦合。
- 所有查询必须带上当前用户的 `user_id`。

### 6.4 doc.documents

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

状态值：

```text
uploaded
processing
ready
failed
```

### 6.5 doc.document_chunks

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

建议索引：

```sql
CREATE INDEX idx_document_chunks_kb_user
ON doc.document_chunks (kb_id, user_id);
```

向量索引根据 pgvector 版本和数据规模选择，第一版可以先用基础相似度查询，数据量变大后再添加 ivfflat 或 hnsw 索引。

### 6.6 chat.chat_sessions

```text
id
kb_id
user_id
title
created_at
updated_at
```

### 6.7 chat.chat_messages

```text
id
session_id
user_id
role
content
sources jsonb
created_at
```

`role` 可选：

```text
user
assistant
system
```

### 6.8 doc.ingestion_jobs

```text
id
document_id
status
error_message
started_at
finished_at
```

说明：

- 第一版可以不做复杂任务队列。
- 该表用于记录文档解析、切分、向量化等处理过程。

---

## 7. 项目目录结构

推荐使用前端应用 + 多 Java 服务 + infra 的结构：

```text
knowflow-ai/
  apps/
    web/
      src/
      package.json
      vite.config.ts

  services/
    auth-service/
      pom.xml
      src/main/java/
      src/main/resources/
      src/test/java/

    kb-service/
      pom.xml
      src/main/java/
      src/main/resources/
      src/test/java/

    document-service/
      pom.xml
      src/main/java/
      src/main/resources/
      src/test/java/

    rag-service/
      pom.xml
      src/main/java/
      src/main/resources/
      src/test/java/

    chat-service/
      pom.xml
      src/main/java/
      src/main/resources/
      src/test/java/

  infra/
    nginx/
      nginx.conf
    postgres/
      init.sql
    docker-compose.yml

  docs/
    architecture.md
    api-spec.md
    database-schema.md
    rag-flow.md
    microservices.md
    interview-notes.md

  README.md
```

说明：

- 每个 Java 服务采用独立 Maven 项目。
- 暂不使用 Maven 多模块，降低学习成本。
- 如果后续服务之间出现大量重复代码，再考虑抽出 `common` 模块。
- 第一版允许少量 DTO 重复，优先保证服务边界清晰和项目可运行。

---

## 8. 开发里程碑

### 第 1 周：项目初始化

目标：搭建前端、Java 微服务骨架、数据库和 Nginx Gateway，让整体链路能跑起来。

任务：

- 保持 React + Vite + TypeScript 前端结构。
- 初始化 5 个 Spring Boot 服务：`auth-service`、`kb-service`、`document-service`、`rag-service`、`chat-service`。
- 每个服务配置 Maven、Spring Web、MyBatis、PostgreSQL Driver、Validation、Actuator。
- 编写 Docker Compose，启动 PostgreSQL + pgvector。
- 编写 Nginx 配置，统一转发 `/api/**`。
- 编写数据库初始化 SQL，创建 schema 和 pgvector extension。
- 实现每个服务的 `/health`。
- 编写 README 中的本地启动说明。

验收标准：

- 前端页面可以打开。
- PostgreSQL + pgvector 可以通过 Docker Compose 启动。
- Nginx Gateway 可以启动。
- 每个 Spring Boot 服务可以启动。
- `/api/health` 或各服务 health 接口返回正常。
- README 中有本地启动说明。

### 第 2 周：auth-service 和前端登录

目标：完成登录注册和基础产品界面。

任务：

- 实现注册接口。
- 实现登录接口。
- 实现退出接口。
- 实现获取当前用户接口。
- 使用 BCrypt 保存密码。
- 使用 JWT + httpOnly Cookie 保存登录态。
- 前端完成登录页和注册页。
- 实现前端登录态管理。
- 实现前端路由守卫。
- 完成 Dashboard 基础布局。

验收标准：

- 用户可以注册。
- 用户可以登录。
- 刷新页面后登录态仍然存在。
- 未登录不能访问业务页面。
- 用户可以退出登录。

### 第 3 周：kb-service 和知识库页面

目标：完成知识库管理。

任务：

- 实现知识库 CRUD。
- 后端所有知识库查询都按当前用户过滤。
- 前端实现知识库列表页。
- 前端实现知识库详情页。
- 前端实现创建、编辑、删除知识库。

验收标准：

- 用户可以创建、编辑、删除知识库。
- 用户只能看到自己的知识库。
- 未登录访问知识库接口会返回认证错误。
- 前端错误提示清晰。

### 第 4 周：document-service 上传、解析和 chunk 切分

目标：完成文档从文件到文本片段的处理流程。

任务：

- 实现 TXT 解析。
- 实现 Markdown 解析。
- PDF 解析可先预留接口，第二阶段再接 Apache PDFBox。
- 实现文本清洗。
- 实现 chunk 切分。
- 将 chunk 写入数据库。
- 实现文档上传接口。
- 限制文件类型和大小。
- 实现 chunk 预览接口。
- 前端实现上传组件、文档列表、文档详情页和 chunk 预览。

验收标准：

- 用户可以上传 TXT / Markdown。
- 上传后文档出现在列表中。
- 文档状态能从 processing 变为 ready。
- 文档详情页可以查看 chunk 预览。
- 非法文件会显示明确错误。
- 解析失败时文档状态变为 failed，并展示错误原因。

### 第 5 周：rag-service Embedding 和向量检索

目标：完成 RAG 的检索基础。

任务：

- 封装 Embedding API 调用。
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
- 切换 embedding 模型时，README 说明需要重建向量或重新索引。

### 第 6 周：chat-service + rag-service 问答闭环

目标：完成用户提问到 AI 回答的完整闭环。

任务：

- `chat-service` 实现会话创建接口。
- `chat-service` 实现消息保存和历史消息查询。
- `rag-service` 实现 RAG prompt 构造。
- `rag-service` 调用 LLM 生成回答。
- `rag-service` 返回引用来源。
- `rag-service` 调用 `chat-service` 保存 assistant 消息。
- 前端实现基础问答页。

验收标准：

- 用户可以在知识库中创建会话。
- 用户可以提问。
- 系统可以根据知识库资料回答。
- 回答下方展示引用来源。
- 刷新页面后历史消息仍然存在。

### 第 7 周：SSE 流式输出和交互优化

目标：提升 AI 问答体验。

任务：

- `rag-service` 实现 SSE 流式响应。
- Nginx 配置支持 SSE 转发。
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
- Nginx 转发下 SSE 仍然正常。

### 第 8 周：微服务工程化和安全细节

目标：让项目更像真实工程，而不是 demo。

任务：

- 各服务统一错误响应格式。
- 使用 `jakarta.validation` 做接口参数校验。
- 增加基础 rate limit，可先在 Nginx 层实现。
- 增加请求日志。
- 统一前端 API 请求封装。
- 统一 loading 和 toast 提示。
- 清理上传文件策略。
- 补充 `.env.example`。
- 补充服务间调用说明。
- 补充 Docker Compose 一键启动说明。

验收标准：

- 接口错误格式统一。
- 非法参数不会导致服务崩溃。
- 前端错误提示清晰。
- README 可以指导别人本地运行项目。
- Nginx、PostgreSQL、各服务配置关系清楚。

### 第 9 周：测试和部署演示

目标：让项目可以演示、可以验证。

任务：

- 编写 chunk 切分单元测试。
- 编写 prompt 构造单元测试。
- 编写鉴权逻辑测试。
- 编写上传校验测试。
- 编写核心 API 集成测试。
- 编写服务间调用测试。
- 准备 Docker Compose 演示环境。
- 准备演示数据。

验收标准：

- 核心测试通过。
- 本地 Docker Compose 演示环境可用。
- 演示账号可用。
- 可以完整演示上传资料和 AI 问答流程。
- 可以说明各服务如何启动和通信。

### 第 10-12 周：简历和面试打磨

目标：把项目转化为求职竞争力。

任务：

- 完善 README。
- 添加项目架构图。
- 添加微服务调用图。
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
- 能讲清楚为什么当前版本不用 Spring Cloud。

---

## 9. 测试计划

### 9.1 单元测试

使用 JUnit 5。

需要测试：

- `chunkText()`：短文本、长文本、空文本、中文段落、Markdown 标题。
- `buildRagPrompt()`：有上下文、无上下文、上下文过长。
- `validateUpload()`：非法类型、超大文件、空文件。
- JWT 工具类：有效 token、过期 token、非法 token。
- 权限校验逻辑：用户只能访问自己的数据。

### 9.2 后端集成测试

使用 Spring Boot Test。

Testcontainers 可选，不作为第一版强制要求。第一版可以通过 Docker Compose PostgreSQL 做本地集成测试。

需要测试：

- 注册登录后可以获取当前用户。
- 未登录不能访问知识库 API。
- 用户只能访问自己的知识库和文档。
- 上传文档后状态可以变为 ready。
- 文档 ready 后可以检索到相关 chunk。
- 提问后会保存用户消息和 assistant 消息。
- assistant 消息包含 sources。
- `document-service` 到 `rag-service` 的处理链路可以跑通。
- Nginx Gateway 能正确转发 `/api/**`。

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
- 停止某个 Spring Boot 服务后，Nginx 或前端应展示可理解的错误。

---

## 10. 简历写法

### 10.1 简历项目描述

```text
基于 React + Vite + TypeScript + Spring Boot 微服务 + PostgreSQL/pgvector 实现智能知识库问答平台。项目按业务能力拆分为 auth-service、kb-service、document-service、rag-service、chat-service，并通过 Nginx 统一转发 /api 接口。系统支持用户上传 Markdown/TXT/PDF 文档，后端完成文本解析、chunk 切分、Embedding 向量化和 pgvector 相似度检索，并结合大模型生成带引用来源的回答。负责前端交互、Java 后端 API、JWT 鉴权、MyBatis 数据访问、数据库 schema 设计、RAG 流程实现和 Docker Compose 本地编排。
```

### 10.2 简历亮点 bullet

```text
- 设计并实现文档上传、解析、切分、向量化、检索、生成回答的完整 RAG 链路。
- 使用 Spring Boot 拆分 auth、knowledge base、document、rag、chat 多个服务，并通过 Nginx Gateway 统一暴露 /api 入口。
- 使用 PostgreSQL + pgvector 存储和检索文档向量，避免额外引入独立向量数据库，降低部署复杂度。
- 实现流式回答渲染和引用来源展示，提升 AI 问答体验和结果可解释性。
- 使用 Spring Security + JWT + httpOnly Cookie 实现登录鉴权，并在各服务中进行用户数据隔离。
- 使用 MyBatis 编写 SQL 和 Mapper，结合 Flyway 管理数据库 schema 与迁移。
- 通过 Docker Compose 编排 PostgreSQL/pgvector、Nginx 和多个 Spring Boot 服务，完成本地可演示环境。
```

### 10.3 技术栈写法

```text
前端：React、Vite、TypeScript、Tailwind CSS、React Router、组件化开发、流式渲染
后端：Java 21、Spring Boot、Spring MVC、Spring Security、MyBatis、RESTful API、JWT、文件上传、参数校验
微服务：Nginx Gateway、Docker Compose、HTTP 服务间调用、服务边界设计、环境变量配置
数据库：PostgreSQL、pgvector、Flyway、SQL、索引、表关系设计、schema 隔离
AI 应用：LLM API、Embedding、RAG、向量检索、Prompt 构造、引用溯源
工程化：Git、Maven、Docker Compose、环境变量管理、接口联调、项目部署
```

---

## 11. 面试讲解提纲

### 11.1 项目整体介绍

可以这样说：

```text
这个项目是一个智能知识库问答平台，用户可以上传自己的学习资料或项目文档。前端使用 React，后端使用多个 Spring Boot 服务按业务能力拆分，包括用户鉴权、知识库、文档处理、RAG 和会话服务。用户上传文档后，document-service 会解析和切分文本，rag-service 会生成 embedding 并写入 PostgreSQL 的 pgvector 字段。用户提问时，系统会先把问题转成向量，在当前知识库中检索相关片段，再把这些片段作为上下文交给大模型生成回答。前端会以流式输出的方式展示回答，并在回答下方展示引用来源。
```

### 11.2 为什么做这个项目

可以这样说：

```text
我不想只做普通的 CRUD 项目，所以选择做一个结合前端、Java 后端、微服务、数据库和 AI 应用的全栈项目。这个项目既能体现 Web 开发基础，也能体现我对 Spring Boot 微服务拆分、RAG 和大模型应用落地的理解。
```

### 11.3 最核心的技术难点

可重点讲：

- Spring Boot 多服务如何拆分职责。
- Nginx 如何统一转发 `/api/**`。
- JWT 登录态如何在多个服务中校验。
- 文档解析和切分。
- embedding 生成和维度统一。
- pgvector 相似度检索。
- RAG prompt 构造。
- 流式回答前端渲染。
- 引用来源展示。
- 用户数据隔离。

### 11.4 如果面试官问“为什么不用 Spring Cloud”

可以这样回答：

```text
这个项目当前规模比较小，核心目标是完成可演示的业务闭环和理解微服务边界。如果一开始引入 Spring Cloud、注册中心、配置中心和链路追踪，会明显增加部署和调试成本，反而影响核心功能交付。所以第一版采用多个独立 Spring Boot 服务 + Nginx Gateway + Docker Compose 的轻基础设施方案。这样仍然可以体现服务拆分、独立启动、服务间 HTTP 调用和统一入口，后续如果项目规模扩大，再升级到 Spring Cloud 或服务发现体系。
```

### 11.5 如果面试官问“为什么共享 PostgreSQL”

可以这样回答：

```text
严格微服务可以做到每个服务独立数据库，但这个项目是实习项目和学习项目，第一版更重要的是交付完整功能和降低本地部署复杂度。所以我使用一个 PostgreSQL 实例，并按 auth、kb、doc、rag、chat 划分 schema。每个服务只访问自己的 schema，通过这种方式体现数据边界。后续如果要进一步工程化，可以把不同 schema 拆到不同数据库实例。
```

### 11.6 如果面试官问“服务是怎么拆分的”

可以这样回答：

```text
我按业务能力拆分，而不是按技术层拆分。auth-service 负责用户和 JWT，kb-service 负责知识库，document-service 负责文件和 chunk，rag-service 负责 embedding、检索和模型调用，chat-service 负责会话和消息历史。这样每个服务的职责比较清楚，也方便后续独立扩展。
```

### 11.7 如果面试官问“服务之间怎么通信”

可以这样回答：

```text
第一版使用 HTTP 同步调用。Docker Compose 中每个服务都有固定服务名，例如 rag-service 可以通过 http://chat-service:端口 调用 chat-service。前端不直接访问具体服务，而是统一请求 /api/**，由 Nginx 根据路径转发到对应服务。
```

### 11.8 如果面试官问“这个项目和普通 ChatGPT 套壳有什么区别”

可以这样回答：

```text
普通套壳聊天通常只是把用户问题直接发给模型，而这个项目会先把用户上传的资料解析成文本片段，再生成向量存储。用户提问时，系统会先从知识库中检索相关内容，再让模型基于这些内容回答，并展示引用来源。所以它解决的是“基于用户私有资料问答”的问题，而不是单纯调用大模型接口。
```

### 11.9 如果面试官问“RAG 如何减少幻觉”

可以这样回答：

```text
RAG 通过检索外部知识库，把相关资料片段放入 prompt 中，让模型基于给定资料回答，而不是完全依赖模型参数中的记忆。同时我在 prompt 中要求模型只基于资料回答，如果资料不足就明确说明，并在前端展示引用来源。这样可以降低模型编造答案的概率，也方便用户检查回答依据。
```

### 11.10 如果面试官问“为什么选择 pgvector”

可以这样回答：

```text
这个项目的数据规模不大，主要用于实习项目和中小型知识库场景。PostgreSQL 本身可以存业务数据，pgvector 又能存储和检索向量，这样可以减少系统组件数量，降低部署复杂度。相比单独部署 Qdrant 或 Milvus，PostgreSQL + pgvector 更适合当前项目阶段。
```

---

## 12. 风险与取舍

### 12.1 最大风险：完整微服务复杂度高

风险：

- 如果同时做复杂 UI、复杂后端、完整微服务基础设施、复杂 AI、复杂部署，3 个月可能做不完。

应对：

- 先完成 MVP。
- 不使用 Spring Cloud、注册中心、K8s。
- 不做消息队列，文档处理第一版同步或简单异步线程。
- 不做每服务独立数据库。
- 使用 Nginx + Docker Compose 控制复杂度。
- 第一版只支持 TXT / Markdown，PDF 可作为第二阶段。
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
- README 中说明 API Key 配置方式。

### 12.3 PDF 解析效果不稳定

风险：

- 某些 PDF 是扫描件，无法直接提取文本。

应对：

- 第一版优先支持 TXT / Markdown。
- PDF 放到第二阶段，使用 Apache PDFBox。
- 第一版明确不支持 OCR。
- 解析不到文本时展示错误提示。
- 演示时使用可复制文本的 PDF。

### 12.4 向量维度不一致

风险：

- 切换 embedding 模型后，向量维度不同，导致数据库写入失败。

应对：

- 环境变量固定 embedding 模型和维度。
- README 中说明切换模型需要重建向量表或重新索引。
- `rag-service` 启动时检查配置维度与数据库字段是否一致。

### 12.5 服务间调用失败

风险：

- 某个服务未启动或网络配置错误，会导致业务链路中断。

应对：

- 每个服务提供 health 接口。
- Nginx 转发配置写清楚。
- Docker Compose 使用固定服务名。
- 前端展示明确错误，不直接白屏。
- README 提供排查步骤。

### 12.6 项目做完但不会讲

风险：

- 只会跑项目，但面试讲不清楚。

应对：

- 第 10-12 周专门准备 README、演示视频和面试讲解稿。
- 每个技术点都准备“为什么这么做”和“有什么替代方案”。
- 微服务部分重点准备“不用 Spring Cloud”“共享 PostgreSQL”“按业务拆分”的解释。

---

## 13. 最小可行版本 MVP

如果时间紧，必须优先完成以下功能：

```text
1. auth-service 注册 / 登录
2. kb-service 创建知识库
3. document-service 上传 TXT / Markdown 文档
4. document-service 文档切分
5. rag-service Embedding 入库
6. rag-service pgvector 向量检索
7. chat-service 保存会话消息
8. rag-service 生成回答和引用来源
9. Nginx Gateway 统一 /api
10. README 和 Docker Compose 启动说明
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
8. Spring Cloud
9. 注册中心
10. 消息队列
11. Kubernetes
12. 每服务独立数据库
```

---

## 14. 最终交付物

项目完成时应包含：

- GitHub 仓库
- 前端源码
- 多个 Spring Boot 服务源码
- 数据库初始化脚本
- Flyway migration
- Nginx 配置
- Docker Compose 配置
- `.env.example`
- README
- 项目架构图
- 微服务调用图
- RAG 流程图
- API 文档
- 本地演示环境
- 演示账号
- 演示视频
- 面试讲解文档
- 简历项目描述

---

## 15. 推荐执行顺序

不要从 UI 美化开始，也不要一开始就纠结 Spring Cloud 或模型效果。

推荐顺序：

```text
1. 先跑通前端、Nginx、Java 服务、数据库
2. 再完成 auth-service 登录注册
3. 再完成 kb-service 知识库 CRUD
4. 再完成 document-service 上传和 chunk
5. 再完成 rag-service embedding 和检索
6. 再完成 chat-service 会话消息
7. 再完成 RAG 问答闭环
8. 再做流式输出
9. 最后做 UI 打磨、测试、部署、简历包装
```

开发原则：

- 每周都要有可运行成果。
- 每完成一个服务先写 health 接口。
- 每完成一个核心接口先用 Postman 或 curl 验证。
- 不要在 MVP 前引入 Spring Cloud。
- 不要在 MVP 前追求完美微服务治理。
- 能跑通业务闭环比架构名词更重要。

---

## 16. 学习重点配套

### 前端

- React 组件拆分
- TypeScript 泛型和接口
- React Router 路由鉴权
- Zustand 状态管理
- 表单校验
- 文件上传
- SSE / fetch stream
- shadcn/ui 或自定义组件
- 错误状态和 loading 状态设计

### 后端

- Java 21 基础
- Spring Boot 项目结构
- Spring MVC Controller / Service / Mapper 分层
- Spring Security 基础
- JWT 鉴权
- BCrypt 密码加密
- MyBatis Mapper 和 XML / 注解 SQL
- Maven 依赖管理
- `jakarta.validation` 参数校验
- MultipartFile 文件上传
- JUnit 5 单元测试
- Spring Boot Test 集成测试
- Docker Compose 基础
- Nginx 反向代理基础
- REST 服务拆分
- HTTP 服务间调用

### 数据库

- PostgreSQL 基础 SQL
- schema 设计
- 主键
- 外键取舍
- 索引
- jsonb
- pgvector
- Flyway migration
- 用户数据隔离
- 向量维度管理

### AI 应用

- LLM API 调用
- Embedding API 调用
- RAG 基本流程
- chunk 切分策略
- topK 检索
- Prompt 构造
- 引用来源设计
- 流式输出
- 模型 API 错误处理

### 微服务

- 按业务能力拆分服务
- 统一 API Gateway
- 服务间 HTTP 调用
- Docker Compose 服务名通信
- 共享数据库 + schema 隔离
- 服务健康检查
- 统一错误响应
- 本地可演示环境设计

---

## 17. 结论

KnowFlow AI 是一个适合作为实习求职项目的全栈 + AI 应用项目。

调整为 Java 轻基础设施完整微服务后，它更适合同时展示：

- 前端 React 工程能力
- Java Spring Boot 后端能力
- MyBatis 和 SQL 能力
- 微服务拆分和服务边界意识
- Docker Compose 本地编排能力
- PostgreSQL/pgvector 数据库能力
- RAG 和大模型应用能力

这个版本的关键不是一开始追求 Spring Cloud、K8s 或复杂服务治理，而是用多个独立 Spring Boot 服务把真实业务闭环跑通，并能清楚解释每个取舍。

如果能按计划完成 MVP，并补齐 README、架构图、微服务调用图、部署演示、演示视频和面试讲解，这个项目足够支撑前端 / Java 后端 / Java 全栈实习面试中的项目部分。

最重要的是：

- 能把前端做出来
- 能把 Java 后端服务跑起来
- 能设计前后端接口和数据库
- 能拆分清楚服务职责
- 能完成 RAG 问答闭环
- 能把项目部署、演示、讲清楚

这正好符合“先找前端、Java 后端或全栈实习，后续再转 AI 应用方向”的路线。
