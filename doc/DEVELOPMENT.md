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

知识库列表：

```powershell
Invoke-RestMethod http://localhost:8080/api/knowledge-bases
```

知识库详情：

```powershell
Invoke-RestMethod http://localhost:8080/api/knowledge-bases/1
```

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
