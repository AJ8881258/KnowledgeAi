# 前端任务书：阶段 12 权限与团队协作

本任务书是前端会话的固定入口。后续每个阶段都复用本文件，由文档会话实时更新当前任务。前端会话必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文件。

## 当前目标

阶段 12：权限与团队协作。

阶段 12 前端已完成接入。当前文件保留本阶段实现范围、验收命令和手动验收路径，方便后续收尾、回归和提交说明使用。

已实现目标：接入阶段 12 后端知识库共享协作接口，让用户能看到自己创建的知识库和共享给自己的知识库，并按 `OWNER` / `EDITOR` / `VIEWER` 权限展示可用操作。

## 必读规则

- 继续使用 axios wrapper，不新增直接 `fetch`。
- 不新增组件级 `localStorage`。
- 不新增 mock-only 协作数据。
- 遵守现有 shadcn/radix-sera、Lucide、Tailwind 风格。
- 参考 `$ui-ux-pro-max`，保持专业 SaaS/知识库工具审美。
- 除非用户明确要求 `@chrome`、`@浏览器`、Playwright 或截图验收，否则不要主动打开浏览器验收。
- `/KnowledgeBases/{id}` 继续只保留检索测试区，不恢复 RAG 对话入口。
- Chat 页面只使用当前用户自己的会话，不展示其他成员的会话。

## 接口状态

阶段 12 后端已让知识库响应新增：

```json
{
  "accessRole": "OWNER",
  "ownedByMe": true,
  "sharedWithMe": false
}
```

角色含义：

| 角色 | 前端可展示能力 |
|---|---|
| `OWNER` | 可编辑知识库、删除知识库、上传/删除文档、检索、Chat、管理成员 |
| `EDITOR` | 可编辑知识库、上传/删除文档、检索、Chat；不可删除知识库、不可管理成员 |
| `VIEWER` | 只能查看知识库、查看文档、检索、Chat；不可编辑、上传、删除或管理成员 |

成员管理接口：

```http
GET /api/knowledge-bases/{knowledgeBaseId}/members
POST /api/knowledge-bases/{knowledgeBaseId}/members
PATCH /api/knowledge-bases/{knowledgeBaseId}/members/{memberId}
DELETE /api/knowledge-bases/{knowledgeBaseId}/members/{memberId}
```

已新增 API wrapper：

```text
src/api/knowledge-base-members.ts
```

## 已完成实现

1. 已更新知识库 API 类型：`accessRole`、`ownedByMe`、`sharedWithMe`。
2. 已新增成员管理 API wrapper 和类型。
3. 知识库列表支持“全部 / 我的知识库 / 共享给我 / 精选”筛选。
4. 知识库卡片和详情页显示角色标识：拥有者、可编辑、只读。
5. 知识库详情页新增成员管理入口，仅 `OWNER` 可见。
6. `OWNER` 可添加成员、修改 `EDITOR` / `VIEWER`、移除成员。
7. `EDITOR` 可编辑知识库、上传/删除文档，但不能删除知识库或管理成员。
8. `VIEWER` 只能查看、检索、进入 Chat 问答，不能编辑、上传或删除。
9. 401 继续按登录失效处理：toast 提示、清理 auth store、跳转 `/login`。
10. 403 显示“当前角色无权执行此操作”。
11. 404 显示“不存在或无权访问”。
12. 未做团队空间、组织后台、邀请邮件、公开链接或复杂审计后台。

## UI 要求

- 成员管理使用紧凑弹窗或侧栏，不做复杂组织后台。
- 权限不足的操作优先隐藏；如果保留按钮，必须禁用并给出清晰原因。
- 成员列表展示用户名、角色和操作按钮。
- 添加成员表单使用用户名输入框和角色选择控件。
- 角色文案建议：
  - `OWNER`：拥有者
  - `EDITOR`：可编辑
  - `VIEWER`：只读
- 不做营销式页面。
- 不做嵌套卡片堆叠。
- 不让成员列表、长用户名或权限文案撑破布局。

## 建议涉及文件

可能新增：

- `src/api/knowledge-base-members.ts`
- `src/components/knowledge-bases/knowledge-base-member-dialog.tsx`

可能修改：

- `src/api/knowledge-bases.ts`
- `src/pages/KnowledgeBases.tsx`
- `src/pages/Documents.tsx`
- `src/pages/Chat.tsx`
- `src/components/knowledge-bases/knowledge-base-types.ts`
- `src/components/knowledge-bases/knowledge-base-utils.ts`
- `src/components/knowledge-bases/knowledge-base-list-view.tsx`
- `src/components/knowledge-bases/knowledge-base-detail-view.tsx`
- `src/components/documents/*`
- `src/components/chat-page/*`

## 验收命令

```powershell
pnpm build
```

目标 ESLint：

```powershell
pnpm eslint src/pages/KnowledgeBases.tsx src/pages/Documents.tsx src/pages/Chat.tsx src/api/knowledge-bases.ts src/api/documents.ts src/api/chat.ts src/components/knowledge-bases src/components/documents src/components/chat-page
```

如果全量 `pnpm lint` 仍有历史问题，只说明哪些不是本次修改范围。

## 手动验收路径

- `/KnowledgeBases`：检查我的知识库、共享给我的知识库、角色标识。
- `/KnowledgeBases/{id}`：检查成员管理、检索测试区、权限按钮。
- `/Documents/{knowledgeBaseId}`：检查 `EDITOR` / `VIEWER` 上传和删除权限。
- `/Chat` / `/Chat/{sessionId}`：检查共享知识库可问答，但会话不跨成员共享。

## 完成后输出

完成后请输出：

1. 修改了哪些文件。
2. 我的知识库/共享给我的知识库如何区分。
3. `OWNER` / `EDITOR` / `VIEWER` 各自能看到和操作什么。
4. 是否新增 API 类型或 wrapper。
5. 运行了哪些校验命令和结果。
6. 需要用户手动验收的路径和步骤。
