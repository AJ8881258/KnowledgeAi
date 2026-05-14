# 项目概览

## 项目定位

KnowFlow AI 是一个智能知识库问答平台。目标是让用户上传学习资料、项目文档或产品文档后，可以基于自己的资料进行问答。

当前阶段先完成基础全栈闭环：

- 前端页面能调用真实后端接口。
- 后端能连接 PostgreSQL。
- 数据库结构由 Flyway 管理。
- 用户可以注册、登录。
- 前端可以读取后端知识库数据。

文档上传、文档解析、文档切片是下一阶段后端重点。向量检索和 AI 问答仍放在后续阶段。

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
- `documents` 表已在初始迁移中存在，但字段仍是早期占位设计；文档上传阶段需要通过新的 Flyway 迁移升级字段。
- 知识库列表、详情、创建、修改、删除接口。
- 知识库接口按 JWT 当前用户隔离数据。
- 知识库支持 `featured` 精选标记和 `themeId` 主题色字段。
- 注册接口。
- 登录接口，成功后返回 JWT `accessToken`。
- Spring Security 基础配置。

前端已经开始接入真实后端：

- axios 请求封装。
- 登录页接入真实后端登录接口。
- 注册入口接入真实后端注册接口。
- 找回密码入口接入当前学习版重置密码接口。
- 登录成功后保存用户信息、`tokenType` 和 `accessToken`。
- “记住我”使用本地持久化；未勾选时使用会话级持久化。
- 已登录用户访问 `/login` 会自动跳转回目标页面。
- 未登录用户访问主应用页面会跳转 `/login`。
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

1. 前端知识库页面对接真实 CRUD 接口，不再依赖 mock 数据。
2. 登录态完善：新增 `GET /api/auth/me`，让后端能根据 token 返回当前用户。
3. 后端文档上传第一阶段：TXT / Markdown / 文本型 PDF 上传、文本读取、简单切片、`INDEXED` / `FAILED` 状态。
4. 后续再做 embedding、向量检索和 RAG 问答。
