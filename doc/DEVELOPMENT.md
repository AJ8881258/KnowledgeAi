# 本地开发说明

## 前置要求

- Node.js 和 pnpm。
- Java 21。
- Docker Desktop。
- Maven Wrapper 使用后端自带的 `mvnw.cmd`。

## 前端启动

在项目根目录执行：

```powershell
pnpm dev
```

默认访问：

```text
http://localhost:5173
```

## 后端数据库启动

进入后端目录：

```powershell
cd D:\Studio\MyWork\backend
```

正常启动 PostgreSQL：

```powershell
docker compose up -d
```

不要把下面命令当成日常启动命令：

```powershell
docker compose down -v
```

`down -v` 会删除 PostgreSQL volume，也就是删除本地数据库数据。它只适合早期开发时需要重建数据库的情况。

## 后端启动

进入后端目录：

```powershell
cd D:\Studio\MyWork\backend
```

运行测试：

```powershell
.\mvnw.cmd test
```

启动后端：

```powershell
.\mvnw.cmd spring-boot:run
```

后端默认地址：

```text
http://localhost:8080
```

## 常用接口测试

注册：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/register `
  -ContentType "application/json" `
  -Body '{"username":"test001","password":"123456"}'
```

登录：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin"}'
```

登录成功后会返回 `tokenType` 和 `accessToken`。前端后续不要保存密码明文，只保存用户信息和 `accessToken`。

重置密码：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/reset-password `
  -ContentType "application/json" `
  -Body '{"username":"test001","newPassword":"new123"}'
```

知识库列表：

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body '{"username":"WuLong","password":"WuLong"}'

$headers = @{
  Authorization = "$($login.tokenType) $($login.accessToken)"
}

Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:8080/api/knowledge-bases `
  -Headers $headers
```

知识库详情：

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:8080/api/knowledge-bases/1 `
  -Headers $headers
```

创建知识库：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/knowledge-bases `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"name":"测试知识库","description":"用于接口测试","featured":true,"themeId":"green"}'
```

修改知识库：

```powershell
Invoke-RestMethod `
  -Method Patch `
  -Uri http://localhost:8080/api/knowledge-bases/4 `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"name":"测试知识库-已修改","description":"修改后的描述","featured":false,"themeId":"blue"}'
```

删除知识库：

```powershell
curl.exe -i -X DELETE http://localhost:8080/api/knowledge-bases/4 -H "Authorization: $($headers.Authorization)"
```

文档上传第一阶段手工测试：

```powershell
# 1. 登录并准备 Authorization 请求头
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin"}'

$headers = @{
  Authorization = "$($login.tokenType) $($login.accessToken)"
}

# 2. 创建一个测试知识库，记录返回的 id
$kb = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/knowledge-bases `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"name":"文档上传测试库","description":"用于测试文档上传","featured":false,"themeId":"blue"}'

# 3. 准备一个本地 Markdown 文件
Set-Content -Path .\sample.md -Encoding UTF8 -Value "# 测试文档`n`n这是第一阶段文档上传和切片测试。"

# 4. 上传文件。Invoke-RestMethod 的 -Form 会自动生成 multipart/form-data
$doc = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8080/api/knowledge-bases/$($kb.id)/documents" `
  -Headers $headers `
  -Form @{ file = Get-Item .\sample.md }

# 也可以把 file 换成文本型 PDF，例如：
# -Form @{ file = Get-Item .\sample.pdf }
# 当前阶段 PDF 只做文本提取，不做扫描图片 OCR。

# 5. 查询文档列表、详情、切片
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/knowledge-bases/$($kb.id)/documents" -Headers $headers
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/documents/$($doc.id)" -Headers $headers
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/documents/$($doc.id)/chunks" -Headers $headers

# 6. 删除文档，应该返回 204 No Content
curl.exe -i -X DELETE "http://localhost:8080/api/documents/$($doc.id)" -H "Authorization: $($headers.Authorization)"
```

## 登录态说明

- 前端登录成功后保存后端返回的 `id`、`username`、`role`、`tokenType`、`accessToken`。
- 前端不能保存密码明文。
- 勾选“记住我”时，登录态保存到 `localStorage`。
- 未勾选“记住我”时，登录态保存到 `sessionStorage`。
- axios 请求拦截器会自动添加：

```http
Authorization: Bearer <accessToken>
```

- 当前 `/api/knowledge-bases/**` 已经需要登录，未携带有效 token 会返回 `401`。

## Flyway 注意事项

Flyway 用来管理数据库结构版本。

已经执行过的迁移文件不要随意修改，例如：

```text
backend/src/main/resources/db/migration/V1__init_schema.sql
```

原因是 Flyway 会记录迁移文件 checksum。文件执行后再改内容、注释或格式，都可能导致 checksum 不一致，启动失败。

如果后续要改表结构，应该新增迁移文件：

```text
V2__add_xxx.sql
V3__update_xxx.sql
```

文档上传第一阶段需要注意：`V1__init_schema.sql` 里已经有早期 `documents` 表，所以不要修改 `V1`，也不要再次 `CREATE TABLE documents`。应该新增：

```text
backend/src/main/resources/db/migration/V3__create_documents_and_document_chunks.sql
```

这个迁移负责把旧的 `documents.filename/file_type/file_size/uploaded_by` 字段升级为 `original_filename/content_type/size_bytes/created_by`，并新增 `error_message` 和 `document_chunks` 表。

## Git 建议

每完成一个小功能提交一次，例如：

- 登录接口。
- 注册接口。
- 前端登录接后端。
- 知识库创建。
- 文档上传。

提交前建议检查：

```powershell
git status
git diff
```
