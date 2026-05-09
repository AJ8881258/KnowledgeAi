# 项目概览

## 项目定位

KnowFlow AI 是一个智能知识库问答平台。目标是让用户上传学习资料、项目文档或产品文档后，可以基于自己的资料进行问答。

当前阶段先完成基础全栈闭环：

- 前端页面能调用真实后端接口。
- 后端能连接 PostgreSQL。
- 数据库结构由 Flyway 管理。
- 用户可以注册、登录。
- 前端可以读取后端知识库数据。

RAG、文档上传、向量检索和 AI 问答放在后续阶段。

## 当前技术栈

前端：

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- axios
- Zustand
- shadcn/radix-sera UI
- Lucide icons

后端：

- Java 21
- Spring Boot
- Spring Web MVC
- Spring Security
- MyBatis
- PostgreSQL
- Flyway
- Maven
- Docker Compose

## 当前已完成

后端已经完成：

- Spring Boot 后端项目骨架。
- PostgreSQL Docker Compose 配置。
- Flyway 初始化表结构。
- `users` 表。
- `knowledge_bases` 表。
- 知识库列表接口。
- 知识库详情接口。
- 注册接口。
- 登录接口，成功后返回 JWT `accessToken`。
- Spring Security 基础配置。

前端已经开始接入真实后端：

- axios 请求封装。
- 登录页逐步从 mock 逻辑迁移到真实接口。
- Vite 代理用于本地转发 `/api/**` 请求。

## 当前架构选择

当前不是微服务。后端先按单体 Spring Boot 项目推进，这样更适合学习和快速完成闭环。

未来可以按业务能力拆分为：

- auth：用户、登录、注册、JWT。
- knowledge-base：知识库 CRUD。
- document：文档上传、解析、切片。
- rag：embedding、向量检索、Prompt 构造。
- chat：会话和消息历史。

## 当前重点

当前优先级：

1. 稳定认证接口。
2. 前端登录和注册接入后端。
3. 完成知识库 CRUD。
4. 做登录态和 JWT。
5. 再进入文档上传和 RAG。
