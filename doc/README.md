# KnowFlow AI 文档导航

这个目录用于替代旧的单篇长计划文档。原文档过长，已经拆成按主题阅读的文档。

## 文档列表

| 文档 | 适合什么时候看 |
|---|---|
| [PROJECT.md](PROJECT.md) | 了解项目定位、当前技术栈、已经完成的功能 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 了解当前前后端结构、数据库、未来拆分方向 |
| [API.md](API.md) | 前后端联调时查看接口路径、请求方式、请求示例 |
| [DEVELOPMENT.md](DEVELOPMENT.md) | 本地启动、测试、数据库和 Flyway 注意事项 |
| [ROADMAP.md](ROADMAP.md) | 查看后续开发顺序和阶段目标 |

## 当前项目状态

KnowFlow AI 当前从前端原型进入后端开发阶段。后端先使用单体 Spring Boot 项目推进，已经完成基础数据库、知识库查询、登录和注册接口。

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
