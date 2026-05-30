# 后端任务书：阶段 16 文档处理可靠性与真正失败重试

本文档是后端 Agent 的固定入口。后端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 16 已完成。**

阶段 16 聚焦文档处理可靠性：上传时持久化原始来源，让失败且没有 chunks 的文档也可以真正重试。本阶段未引入后台任务队列、OCR、PPT/Excel 解析、embedding/pgvector 或 SSE。

## 已完成接口和数据变更

- 新增 Flyway 迁移：`V12__add_document_source_content.sql`。
- `documents` 新增内部字段：
  - `source_bytes BYTEA`：原始上传文件 bytes。
  - `source_text TEXT`：最近一次成功解析出的规范化文本。
  - `source_text_updated_at TIMESTAMPTZ`：`source_text` 最近更新时间。
- `DocumentResponse` 新增公开布尔字段：
  - `sourceStored`：后端是否保存了原始 bytes 或解析文本。
  - `reprocessAvailable`：当前文档是否具备可重新处理来源。
- `POST /api/documents/{documentId}/reprocess` 语义升级为真正失败重试。

## 实现要求记录

1. 原始来源持久化
   - 上传时先读取并保存原始文件 bytes。
   - 即使解析失败，文档记录也保留 `source_bytes`，便于后续修复或重试。
   - 成功解析后保存规范化 `source_text`。
   - `source_bytes` 和 `source_text` 不允许通过 API 响应返回。

2. 重新处理来源优先级
   - 优先使用 `source_bytes` 按原始文件名后缀重新解析。
   - 没有 `source_bytes` 时使用 `source_text`。
   - 两者都没有时，兼容阶段 15 旧文档，使用已有 chunks 拼接文本。
   - 三者都没有时返回 `400`，错误为 `Document cannot be reprocessed because no source or indexed text is available`。

3. 事务和状态
   - 重新处理开始时将文档置为 `PROCESSING`。
   - 成功时在事务内删除旧 chunks、写入新 chunks、更新 `source_text`、置为 `INDEXED`。
   - 失败时置为 `FAILED`，错误信息必须脱敏。
   - chunk 替换失败时旧 chunks 回滚保留，避免半替换数据。

4. 查询性能和隐私
   - 文档列表和详情只查询来源存在性布尔值，不拉取大文件 bytes。
   - 只有重新处理接口需要读取 `source_bytes` / `source_text`。
   - API 响应不得暴露原始文件内容、服务器路径、内部堆栈、API Key 或供应商敏感错误。

5. 注释要求
   - 新增/修改功能代码已写入有价值的 JavaDoc 或业务注释，重点覆盖来源字段、提取器 bytes 重载、重试来源优先级、事务替换和响应字段语义。

## 测试覆盖

- `Stage16DocumentRetryTests` 覆盖：
  - 空白上传失败后仍保存 `source_bytes`，且响应不暴露来源内容。
  - 无 chunks 的失败文档可以基于保存来源重新处理成功。
  - 旧文档无来源无 chunks 时仍返回明确 `400`。
  - 不支持的 `.doc` 文件保存来源，但重试仍返回脱敏的不支持类型错误。
- `Stage15DocumentQualityTests` 已更新阶段 16 的无来源错误文案，保持阶段 15 质量/摘要/权限回归。

## 验证命令

```powershell
cd backend
.\mvnw.cmd -Dtest=Stage16DocumentRetryTests test
.\mvnw.cmd "-Dtest=Stage15DocumentQualityTests,Stage16DocumentRetryTests" test
.\mvnw.cmd test
```
