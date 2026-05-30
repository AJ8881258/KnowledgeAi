# 前端任务书：阶段 16 文档处理可靠性与真正失败重试

本文档是前端 Agent 的固定入口。前端 Agent 开始实现前必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文档。

## 当前阶段状态

**阶段 16 已完成。**

阶段 16 前端只做最小必要接入：识别后端返回的文档来源保存状态和可重试能力，避免把旧的无来源失败文档展示成一定可重试。本阶段未做大规模 Documents UI 重构，也未恢复知识库详情页 Chat 入口。

## API 接入

继续使用 `src/api/documents.ts` axios wrapper，不新增直接 `fetch`，不新增组件级 `localStorage`。

`DocumentResponse` 已新增可选字段：

- `sourceStored?: boolean`：后端是否保存了原始 bytes 或解析文本。
- `reprocessAvailable?: boolean`：当前文档是否有来源可重新处理。

## 已完成实现

1. 类型同步
   - `src/api/documents.ts` 补充 `sourceStored`、`reprocessAvailable`。

2. 文档列表
   - 重新处理/失败重试按钮继续受 `OWNER` / `EDITOR` 权限控制。
   - 当 `reprocessAvailable === false` 时按钮禁用。
   - 无来源失败文档提示：`此文档没有保存原始来源，无法自动重试，请重新上传文件。`
   - 非失败但缺少来源时提示：`当前文档缺少可重新处理的原始来源。`

3. 文档详情
   - 详情面板展示轻量状态：`重试来源：已保存 / 未保存`。
   - 详情里的重新处理按钮同样按 `reprocessAvailable` 禁用。

4. 确认弹窗
   - 有 `sourceStored` 时提示会重新解析原始来源并替换 chunks。
   - 没有 `sourceStored` 但仍可重试时，提示会基于已索引文本重新处理，不会恢复原始文件中未成功解析的内容。

5. 错误处理
   - 后端返回 `400` 时继续展示后端脱敏 message。
   - 403/404 继续使用现有权限和无权访问提示。

## 验证命令

```powershell
pnpm build
pnpm eslint src/pages/Documents.tsx src/pages/KnowledgeBases.tsx src/api/documents.ts src/components/documents src/components/knowledge-bases
```

## 手动验收路径

- `/Documents`：检查失败文档的重试按钮是否按 `reprocessAvailable` 禁用。
- `/Documents/{knowledgeBaseId}`：检查同样的列表行为。
- 文档详情面板：检查“重试来源”状态、重新处理按钮和确认弹窗文案。
- `/KnowledgeBases/{id}`：检索测试区仍只展示真实 chunks，不恢复 Chat 入口。
