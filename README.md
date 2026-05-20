# KnowFlow AI

智能知识库问答平台（RAG-based）

## 项目简介

KnowFlow AI 是一个基于检索增强生成（RAG）的知识库问答平台。用户可以上传学习资料、项目文档或产品文档，系统会自动解析、切片并建立索引，之后用户可以基于自己的资料进行智能问答。

## 功能特性

- 用户认证：注册、登录、JWT 鉴权、重置密码
- 知识库管理：创建、编辑、删除知识库，支持精选标记和主题色
- 文档处理：上传 TXT、Markdown、文本型 PDF，自动解析和切片
- 文档检索：基于 PostgreSQL 关键词匹配的文档片段检索
- RAG 问答：基于检索结果构造 Prompt，调用大模型生成回答并展示引用来源
- 会话管理：创建、重命名、删除、置顶/取消置顶对话会话

## 技术栈

### 前端

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS v4
- React Router 7
- axios
- Zustand
- shadcn/radix-sera UI
- Lucide icons
- Sonner toasts

### 后端

- Java 21
- Spring Boot
- Spring Web MVC
- Spring Security
- MyBatis
- PostgreSQL
- Flyway
- Maven
- Docker Compose

## 项目结构

```
KnowFlow AI/
├── src/                          # 前端源码
│   ├── api/                      # API 接口封装
│   ├── components/               # 组件
│   │   ├── ui/                   # shadcn 基础组件
│   │   ├── chat-page/            # Chat 页面组件
│   │   ├── dashboard/            # Dashboard 组件
│   │   ├── documents/            # 文档组件
│   │   ├── knowledge-bases/      # 知识库组件
│   │   ├── login/                # 登录组件
│   │   └── settings/             # 设置组件
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具函数
│   ├── pages/                    # 页面入口
│   └── store/                    # Zustand 状态管理
├── backend/                      # 后端源码
│   └── src/main/java/            # Java 源码
│       └── com/knowflow/
│           ├── auth/             # 认证模块
│           ├── config/           # 配置
│           ├── knowledgebase/    # 知识库模块
│           ├── document/         # 文档模块
│           ├── chat/             # 聊天模块
│           ├── rag/              # RAG 模块
│           └── user/             # 用户模块
├── doc/                          # 项目文档
│   ├── STAGE_PLAN.md             # 阶段计划（权威来源）
│   ├── PROJECT.md                # 项目概览
│   ├── API.md                    # API 接口文档
│   ├── FRONTEND_TASK.md          # 前端任务
│   └── BACKEND_TASK.md           # 后端任务
├── AGENTS.md                     # AI Agent 协作规则
└── CLAUDE.md                     # Claude Code 配置
```

## 快速开始

### 环境要求

- Node.js 18+
- pnpm
- Java 21+
- Maven 3.8+
- Docker & Docker Compose
- PostgreSQL (通过 Docker Compose 启动)

### 后端启动

```bash
cd backend

# 启动 PostgreSQL
docker compose up -d

# 运行测试
.\mvnw.cmd test

# 启动后端服务
.\mvnw.cmd spring-boot:run
```

后端默认运行在 `http://localhost:8080`

### 前端启动

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 代码检查
pnpm lint
```

前端默认运行在 `http://localhost:5173`

### 模型配置（阶段 6）

在 `backend/src/main/resources/application.properties` 中配置：

```properties
knowflow.ai.base-url=        # OpenAI-compatible API 地址
knowflow.ai.api-key=          # API Key
knowflow.ai.model=            # 模型名称
knowflow.ai.timeout-seconds=60
```

> **注意**：密钥不要提交到版本控制。

## 当前开发阶段

项目已完成阶段 0-6：

- 阶段 0：前端静态原型 ✅
- 阶段 1：后端基础设施 ✅
- 阶段 2：认证闭环 ✅
- 阶段 3：知识库 CRUD ✅
- 阶段 4：文档上传、解析、切片 ✅
- 阶段 5：文档检索 MVP ✅
- 阶段 6：RAG 问答 MVP ✅

当前处于 **阶段 7：前端体验完善**

详细阶段计划请查看 [doc/STAGE_PLAN.md](doc/STAGE_PLAN.md)

## 架构说明

### 开发架构

```
Browser -> Vite Dev Server -> Spring Boot Backend -> PostgreSQL
```

前端通过 Vite 代理转发 `/api/**` 请求到后端 `http://localhost:8080/api/**`。

### RAG 问答流程

```
用户提问
  -> Chat Controller
  -> 校验用户、会话、知识库归属
  -> Document Chunk Search（关键词检索）
  -> Prompt Builder（构造提示词）
  -> OpenAI-compatible Model Client（调用大模型）
  -> Chat Message Storage（保存消息和引用来源）
  -> 返回回答和引用来源
```

### 数据库表

- `users` - 用户表
- `knowledge_bases` - 知识库表
- `documents` - 文档表
- `document_chunks` - 文档切片表
- `chat_sessions` - 会话表
- `chat_messages` - 消息表
- `chat_message_sources` - 引用来源表

## 文档

- [阶段计划](doc/STAGE_PLAN.md) - 开发阶段、状态和验收标准
- [项目概览](doc/PROJECT.md) - 技术栈、架构和当前状态
- [API 文档](doc/API.md) - 后端接口定义
- [前端任务](doc/FRONTEND_TASK.md) - 前端开发任务清单
- [后端任务](doc/BACKEND_TASK.md) - 后端开发任务清单

## 扩展方向

当前阶段暂不实现，可作为后续扩展：

- Embedding 和 pgvector 向量检索
- 流式输出
- 多模型选择
- PDF OCR
- Agent 工作流
- 多租户组织权限
- 复杂后台管理系统

## 许可证

MIT License

## 贡献者

- Akin
