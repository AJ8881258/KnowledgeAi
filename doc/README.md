# KnowFlow AI 文档导航

这个目录用于替代旧的单篇长计划文档。原文档过长，已经拆成按主题阅读的文档。

## 文档列表

| 文档 | 适合什么时候看 |
|---|---|
| [PROJECT.md](PROJECT.md) | 了解项目定位、当前技术栈、已经完成的功能 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 了解当前前后端结构、数据库、未来拆分方向 |
| [API.md](API.md) | 前后端联调时查看接口路径、请求方式、请求示例 |
| [DEVELOPMENT.md](DEVELOPMENT.md) | 本地启动、测试、数据库和 Flyway 注意事项 |
| [STAGE_PLAN.md](STAGE_PLAN.md) | 查看权威阶段计划、阶段状态和验收标准 |
| [ROADMAP.md](ROADMAP.md) | 快速查看简版开发路线 |

## 当前项目状态

KnowFlow AI 当前已经完成认证闭环：后端登录、注册、重置密码接口已实现，前端 Login 页面已接入真实后端接口，并能保存 JWT 登录态。

当前后端已完成知识库 CRUD、按当前用户隔离、精选标记 `featured` 和主题色 `themeId` 字段。Document 阶段已按当前进度标记完成，下一阶段重点是文档检索 MVP：基于 `document_chunks` 做知识库内关键词检索，先不接大模型。

后续如果功能稳定，再按业务能力拆分为 auth、knowledge-base、document、rag、chat 等模块或服务。

## 界面截图

截图已迁移到 [assets](assets/)：

| 页面 | 图片 |
|---|---|
| 首页 | [dashboard.png](assets/dashboard.png) |
| 知识库 | [knowledge-bases.png](assets/knowledge-bases.png) |
| 文档 | [documents.png](assets/documents.png) |
| 聊天 | [chat.png](assets/chat.png) |
| 设置 | [settings.png](assets/settings.png) |
