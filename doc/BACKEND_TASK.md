# 后端任务书：阶段 12 权限与团队协作

本任务书是后端会话的固定入口。后续每个阶段都复用本文件，由文档会话实时更新当前任务。后端会话必须先阅读 `AGENTS.md`、`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md` 和本文件。

## 必读规则

- 注意：我是后端学习阶段，你不要直接改后端业务源码。请给我除了导入部分包其他的完整代码、文件相对路径、实现顺序、文件清单、关键注释和测试命令，我自己写代码。
- 测试类可以直接编辑，`backend/src/test/**` 下的后端测试文件允许 Agent 直接新增或修改。
- 不要修改已经执行过的 Flyway 迁移文件；如果确实需要表结构或索引变化，只能新增迁移文件。
- 任何接口路径、请求体、响应体或错误语义变化，都必须提醒文档会话同步 `doc/API.md`。
- 新增或修改功能代码时，在新增字段、DTO、接口方法、Service 分支、事务边界、权限校验、角色判断等功能点旁附上简短注释，说明业务目的或与旧代码的区别；不要给 import、基础注解、getter/setter 写噪声注释。
- 输出教学代码时，必须按“阅读到当前位置时依赖已经出现”的顺序组织，避免用户从上往下抄代码时一路爆红。跨文件按数据库迁移/表结构、实体和 DTO、Repository、Service/权限工具、Controller、测试的顺序输出；单个文件内也要先给被依赖的字段、常量、DTO、Repository 方法、Service 方法、私有 helper、校验/转换函数，再给调用它们的功能方法。不要在前面的代码里调用后面才首次定义的方法、类或字段；如果为了贴合 Java 常见排版必须把私有方法放在文件底部，也要先在该文件小节开头列出本文件会用到的私有方法清单和用途，避免读者误以为缺方法。

## 当前目标

阶段 12：权限与团队协作。

阶段 12 后端已完成。当前文件保留本阶段实现范围、权限规则、测试要求和收尾说明，方便后续回归、提交说明和学习复盘使用。

已实现目标：把个人知识库模型扩展为知识库共享协作模型。第一版只做单个知识库共享，不做团队空间、组织后台、邀请邮件、公开链接或复杂审计后台。

## 实现范围

本阶段已实现：

1. 已新增 `knowledge_base_members` 表，用 Flyway 新迁移实现，未修改已执行迁移。
2. 知识库创建者默认拥有 `OWNER` 权限。
3. 已支持 `OWNER` 按用户名添加已注册用户为 `EDITOR` 或 `VIEWER`。
4. `OWNER` 可以修改成员角色、移除成员。
5. `OWNER` 不允许被移除，不允许通过成员接口降级 owner。
6. `GET /api/knowledge-bases` 返回当前用户可访问的知识库，包括自己创建和别人共享的。
7. 知识库响应新增 `accessRole`、`ownedByMe`、`sharedWithMe`。
8. 文档、检索、Chat 相关接口已从 `created_by` 判断升级为成员权限判断。
9. 非成员访问知识库、文档、检索、Chat 返回 `404`。
10. 成员存在但角色权限不足时返回 `403`。
11. Chat 会话仍是当前用户自己的会话，不共享其他成员的会话历史。

本阶段不做：

- 不做团队空间。
- 不做组织后台。
- 不做邀请邮件。
- 不做公开链接。
- 不做复杂审计后台。
- 不做多租户组织权限系统。

## 建议数据模型

新增表：

```sql
knowledge_base_members
```

字段建议：

- `id`
- `knowledge_base_id`
- `user_id`
- `role`
- `created_at`
- `updated_at`

约束建议：

- `knowledge_base_id` 外键引用 `knowledge_bases(id)`，删除知识库时级联删除成员。
- `user_id` 外键引用 `users(id)`，删除用户时级联删除成员。
- 唯一约束：`knowledge_base_id + user_id`。
- `role` 只允许 `OWNER`、`EDITOR`、`VIEWER`。

## 角色权限

| 角色 | 权限 |
|---|---|
| `OWNER` | 创建者默认角色；可编辑知识库、删除知识库、上传/删除文档、检索、Chat、管理成员 |
| `EDITOR` | 可查看和编辑知识库、上传/删除文档、检索、Chat；不可删除知识库、不可管理成员 |
| `VIEWER` | 可查看知识库、查看文档、检索、Chat；不可编辑、上传、删除或管理成员 |

错误语义：

- 未登录仍返回 `401`。
- 非成员访问资源返回 `404`，避免暴露资源存在性。
- 成员存在但角色权限不足返回 `403`。

## 接口契约

### 知识库响应新增字段

`GET /api/knowledge-bases` 和 `GET /api/knowledge-bases/{id}` 响应新增：

```json
{
  "accessRole": "OWNER",
  "ownedByMe": true,
  "sharedWithMe": false
}
```

### 成员管理接口

```http
GET /api/knowledge-bases/{knowledgeBaseId}/members
```

仅 `OWNER` 可调用。

```http
POST /api/knowledge-bases/{knowledgeBaseId}/members
```

请求体：

```json
{
  "username": "AKinEdit",
  "role": "EDITOR"
}
```

仅 `OWNER` 可调用。`role` 只能是 `EDITOR` 或 `VIEWER`，不能通过该接口添加 `OWNER`。

```http
PATCH /api/knowledge-bases/{knowledgeBaseId}/members/{memberId}
```

请求体：

```json
{
  "role": "VIEWER"
}
```

仅 `OWNER` 可调用。只能改为 `EDITOR` 或 `VIEWER`，不能把别人改成 `OWNER`，不能降级 owner。

```http
DELETE /api/knowledge-bases/{knowledgeBaseId}/members/{memberId}
```

仅 `OWNER` 可调用。不允许删除 owner 自己的成员记录。

## 现有接口权限改造

- `GET /api/knowledge-bases/{id}`：成员可访问。
- `PATCH /api/knowledge-bases/{id}`：`OWNER` / `EDITOR` 可编辑。
- `DELETE /api/knowledge-bases/{id}`：仅 `OWNER`。
- `POST /api/knowledge-bases/{id}/documents`：`OWNER` / `EDITOR`。
- `GET /api/knowledge-bases/{id}/documents`：成员可访问。
- `GET /api/documents/{id}`、`GET /api/documents/{id}/chunks`：成员可访问。
- `DELETE /api/documents/{id}`：`OWNER` / `EDITOR`。
- `POST /api/knowledge-bases/{id}/search`：成员可访问。
- Chat session 创建、列表、发消息：成员可访问对应知识库，但会话仍归当前用户自己，不共享会话历史。

## 建议实现顺序

1. 新增 Flyway 迁移，创建 `knowledge_base_members` 表和必要索引。
2. 新增成员实体、成员 DTO、成员请求 DTO、成员 Repository。
3. 新增权限判断服务，例如 `KnowledgeBaseAccessService`，集中处理 `OWNER` / `EDITOR` / `VIEWER` 判断。
4. 改造知识库创建逻辑：创建知识库后为创建者写入 `OWNER` 成员记录。
5. 改造知识库列表和详情响应，返回 `accessRole`、`ownedByMe`、`sharedWithMe`。
6. 新增成员管理 Controller 接口。
7. 改造知识库更新、删除权限。
8. 改造文档上传、列表、详情、chunks、删除权限。
9. 改造检索权限。
10. 改造 Chat 会话创建、会话列表、消息列表、发送消息权限。
11. 补充阶段 12 测试，确认阶段 7-11 既有测试仍通过。

后端会话给代码时也必须按上述依赖顺序输出。跨文件先低层依赖再上层调用；单文件内先说明本文件依赖的私有 helper/校验/转换方法，再给调用这些方法的主流程代码。

## 文件清单建议

可能新增：

- `backend/src/main/resources/db/migration/V8__create_knowledge_base_members.sql`
- `backend/src/main/java/com/knowflow/backend/knowledgebase/member/KnowledgeBaseMember.java`
- `backend/src/main/java/com/knowflow/backend/knowledgebase/member/KnowledgeBaseMemberRepository.java`
- `backend/src/main/java/com/knowflow/backend/knowledgebase/member/KnowledgeBaseMemberController.java`
- `backend/src/main/java/com/knowflow/backend/knowledgebase/member/AddKnowledgeBaseMemberRequest.java`
- `backend/src/main/java/com/knowflow/backend/knowledgebase/member/UpdateKnowledgeBaseMemberRequest.java`
- `backend/src/main/java/com/knowflow/backend/knowledgebase/member/KnowledgeBaseMemberResponse.java`
- `backend/src/main/java/com/knowflow/backend/knowledgebase/KnowledgeBaseAccessService.java`
- `backend/src/test/java/com/knowflow/backend/Stage12CollaborationTests.java`

可能修改：

- `backend/src/main/java/com/knowflow/backend/knowledgebase/KnowledgeBase.java`
- `backend/src/main/java/com/knowflow/backend/knowledgebase/KnowledgeBaseRepository.java`
- `backend/src/main/java/com/knowflow/backend/knowledgebase/KnowledgeBaseController.java`
- `backend/src/main/java/com/knowflow/backend/document/controller/DocumentController.java`
- `backend/src/main/java/com/knowflow/backend/document/repository/DocumentRepository.java`
- `backend/src/main/java/com/knowflow/backend/document/repository/DocumentChunkRepository.java`
- `backend/src/main/java/com/knowflow/backend/chat/controller/ChatController.java`
- `backend/src/main/java/com/knowflow/backend/chat/service/ChatService.java`
- `backend/src/main/java/com/knowflow/backend/chat/repository/ChatSessionRepository.java`

## 关键注释要求

关键注释必须说明：

- 为什么要从 `created_by` 判断升级为成员权限判断。
- 为什么非成员访问返回 `404`。
- 为什么 `VIEWER` 可以检索和问答但不能上传/删除文档。
- 为什么 Chat session 仍按当前用户隔离，不共享会话历史。
- 为什么 owner 不能被移除或降级。

## 测试要求

测试至少覆盖：

- owner 创建知识库后自动拥有 `OWNER` 权限。
- owner 可以添加 editor/viewer。
- editor 可以上传文档、检索、Chat，但不能删除知识库或管理成员。
- viewer 可以查看、检索、Chat，但不能上传/删除文档。
- 非成员访问返回 `404`。
- viewer 权限不足操作返回 `403`。
- 共享知识库出现在 `GET /api/knowledge-bases` 返回列表中。
- Chat 会话不跨成员共享。
- 阶段 7-11 既有测试仍通过。

## 验收命令

```powershell
cd backend
.\mvnw.cmd test
```

如果发现 `doc/API.md` 与实际接口需要调整，请列出来交给文档会话同步。
