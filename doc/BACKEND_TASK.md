# 后端任务书：阶段 11 文档处理增强收尾完成

本任务书是后端会话的固定入口。后续每个阶段都复用本文件，由文档会话实时更新当前任务。后端会话必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文件。

## 必读规则

- 注意：我是后端学习阶段，你不要直接改后端业务源码。请给我除了导入部分包其他的完整代码、文件相对路径、实现顺序、文件清单、关键注释和测试命令，我自己写代码。
- 测试类可以直接编辑，`backend/src/test/**` 下的后端测试文件允许 Agent 直接新增或修改。
- 不要修改已经执行过的 Flyway 迁移文件；如果确实需要表结构或索引变化，只能新增迁移文件。
- 任何接口路径、请求体、响应体或错误语义变化，都必须提醒文档会话同步 `doc/API.md`。
- 不要绕过 JWT 用户隔离；知识库、文档、chunks、搜索和 Chat 都必须只访问当前用户自己的数据。
- 新增或修改功能代码时，在新增字段、DTO、接口方法、Service 分支、事务边界、解析分支、状态流转等功能点旁附上简短注释，说明业务目的或与旧代码的区别；不要给 import、基础注解、getter/setter 写噪声注释。

## 当前目标

阶段 11：文档处理增强已完成。

当前后端已在不改变现有上传接口路径和响应结构的前提下，把文档上传解析能力从 TXT、Markdown、文本型 PDF 扩展到 DOCX 和 HTML。

接口保持不变：

```http
POST /api/knowledge-bases/{knowledgeBaseId}/documents
```

## 已完成内容

1. 保留现有 `.txt`、`.md`、`.markdown`、文本型 `.pdf` 支持。
2. 新增 `.docx` 文本提取，优先提取段落和表格文本。
3. 新增 `.html` / `.htm` 文本提取，过滤 `script`、`style`、`noscript` 等非正文内容。
4. 保持单文件 `10MB` 限制。
5. 保持现有 `UPLOADED`、`PROCESSING`、`INDEXED`、`FAILED` 状态流转。
6. 解析成功后继续复用现有切片、`document_chunks` 入库、全文检索索引和 RAG 链路。
7. 解析失败、空文本或不支持格式时返回清晰错误，并把文档标记为 `FAILED`；错误信息不泄露服务器内部路径、堆栈或依赖库原始敏感报错。
8. 未新增上传接口，未新增异步任务接口，未修改搜索或 Chat 接口。

## 本阶段不做

- 不支持旧版 `.doc`。
- 不支持 PPT / PPTX。
- 不支持 Excel / XLSX。
- 不做扫描版 PDF OCR。
- 不做后台队列、任务中心或自动重试中心。
- 不引入 embedding、pgvector 或 Agent 工作流。

## 已涉及文件

- `backend/pom.xml`
- `backend/src/main/java/com/knowflow/backend/document/controller/DocumentController.java`
- `backend/src/main/java/com/knowflow/backend/document/repository/DocumentRepository.java`
- `backend/src/main/java/com/knowflow/backend/document/repository/DocumentChunkRepository.java`
- `backend/src/main/java/com/knowflow/backend/document/service/DocumentTextExtractor.java`
- `backend/src/test/java/com/knowflow/backend/Stage11DocumentProcessingTests.java`

## 关键注释要求

只在关键逻辑旁写简短注释，必须覆盖：

- 为什么支持 `.docx` 但不支持旧版 `.doc`。
- 为什么 HTML 要去掉 `script` / `style` / `noscript`。
- 为什么本阶段不做 OCR、PPT、Excel。
- 为什么解析失败信息要脱敏。
- 为什么解析结果继续进入现有切片和索引流程。

## 验收结果

```powershell
cd backend
.\mvnw.cmd test
```

验收结果：通过，共 41 个测试，0 失败，0 错误。

## 下一阶段占位

下一阶段为阶段 12：权限与团队协作。进入阶段 12 前，文档会话需要重新改写本文件为阶段 12 后端任务书。后端仍按学习规则执行：业务源码默认由用户自己写，测试类 `backend/src/test/**` 可以由 Agent 直接新增或修改。
