# 求职申请追踪器（Job Application Tracker）

帮助个人记录和跟踪求职申请进度的 MVP 全栈项目。单用户数据，不做多角色、团队协作、通知、附件、OAuth。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | Node.js + Express 5 + TypeScript |
| 数据库 | PostgreSQL |
| ORM | Prisma |
| 认证 | Better Auth 1.6+（Session 存 PostgreSQL，不使用 JWT） |
| 前端 | React + Vite + TypeScript + Tailwind CSS |
| 测试 | 后端 Jest + Supertest；端到端 Playwright |

## 目录结构

```
.
├── backend/    # Express 5 后端 + Prisma + Better Auth
├── frontend/   # React + Vite 前端
├── docs/       # 需求规格（overview.md）
└── docker-compose.yml  # 本地 PostgreSQL（开发/测试/E2E）
```

## 快速开始

### 0. 前置要求

- Node.js 18+（推荐 20/22）
- Docker（用于本地 PostgreSQL，或使用你自己的 PostgreSQL）

### 1. 启动数据库

```bash
docker compose up -d
```

这会启动一个 PostgreSQL 16 容器（端口 `5433`），并创建三个数据库：
`jat_dev`、`jat_test`、`jat_e2e`。用户 `jat`，密码 `jat_dev_password`。

> 已有一个正在运行的容器时，可直接复用；`docker/init-databases.sql` 只在首次初始化时执行。

### 2. 配置后端

```bash
cd backend
cp .env.example .env
# 编辑 .env，至少设置 DATABASE_URL 与 BETTER_AUTH_SECRET
```

`BETTER_AUTH_SECRET` 生成方式：

```bash
openssl rand -base64 32
```

### 3. 安装依赖并迁移

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate   # 本地开发迁移（或 npm run prisma:deploy 只应用迁移）
npm run seed             # 可选：创建演示用户和 5 条申请
```

演示账号（seed 后）：`demo@example.com` / `demo-password-123`

### 4. 启动后端

```bash
cd backend
npm run dev   # 监听 http://localhost:4000
```

### 5. 配置并启动前端

```bash
cd frontend
cp .env.example .env   # VITE_API_URL 留空即走同源代理
npm install
npm run dev            # 监听 http://localhost:5173
```

浏览器打开 `http://localhost:5173`，注册账号即可使用。

## 日常启动与停止

### 首次启动（或拉取新代码后）

按顺序执行，**后端必须先于前端启动**，否则前端代理会报 `ECONNREFUSED`：

```bash
# 1. 数据库
cd job_application_tracker
docker compose up -d

# 2. 后端：安装依赖 + 生成 Prisma Client + 应用迁移
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate

# 3. 启动后端（确认看到 listening on http://localhost:4000）
npm run dev
```

另开一个终端：

```bash
# 4. 启动前端
cd frontend
npm install
npm run dev   # http://localhost:5173
```

浏览器打开 `http://localhost:5173`。

### 日常第二次启动（依赖与迁移无变化时）

```bash
# 终端 1：数据库 + 后端
docker compose up -d
cd backend && npm run dev

# 终端 2：前端
cd frontend && npm run dev
```

### 停止

```bash
# 在两个终端分别 Ctrl+C 停掉 dev server
# 停数据库（保留数据）
docker compose down

# 停数据库并删除数据卷（慎用，会清空所有数据）
docker compose down -v
```

## 常见问题排查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| `docker compose up -d` 报 `container name "/jat-postgres" is already in use` | 存在旧容器占用名字（例如曾用 `docker run` 手动创建） | `docker ps -a` 查看该容器，若没有 `com.docker.compose` 标签则 `docker rm jat-postgres` 后重试 |
| 前端报 `[vite] http proxy error: /api/... ECONNREFUSED` | 后端未启动（前端先于后端启动） | 先启动后端（`:4000`），刷新浏览器即可 |
| 后端报 `P2021 ... does not exist in the current database` | 数据库为空，未应用迁移 | `cd backend && npm run prisma:migrate` |
| `npm run prisma:generate` 报 `EPERM ... query_engine-windows.dll.node` | dev server 正在运行，锁住了 Prisma 的 DLL | 先 `Ctrl+C` 停掉后端 dev server，再执行 `npm run prisma:generate`，最后重新 `npm run dev` |

## 环境变量

### 后端（backend/.env）

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL 连接串 |
| `BETTER_AUTH_SECRET` | ✅ | Better Auth 签名密钥（`openssl rand -base64 32`） |
| `BETTER_AUTH_URL` | ❌ | 后端自身公开 URL，默认 `http://localhost:4000` |
| `CORS_ORIGIN` | ❌ | 允许的前端源，默认 `http://localhost:5173` |
| `PORT` | ❌ | 端口，默认 `4000` |
| `NODE_ENV` | ❌ | `development` / `test` / `production` |

### 前端（frontend/.env）

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `VITE_API_URL` | ❌ | 后端 API 基址。留空走同源（开发代理 / 生产同域） |

## Better Auth 配置要点

- 使用 Prisma adapter，`User` / `Session` / `Account` / `Verification` 模型已在 `backend/prisma/schema.prisma` 定义。
- Express 5 挂载路径必须为 `/api/auth/*splat`（非 Express 4 的 `/*`）。
- 不要在 Better Auth handler 之前挂载 `express.json()`；业务路由的 `express.json()` 在 auth handler 之后。
- 受保护路由通过 `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })` 取当前用户，无 session 返回 401。
- 前端用 `better-auth/react` 的 `createAuthClient` + `useSession()`，不手动存 token。
- CORS `credentials: true`，前端 fetch 携带 `credentials: 'include'`。

## 数据库迁移

```bash
cd backend
npm run prisma:migrate   # 开发环境：根据 schema 生成并应用迁移
npm run prisma:deploy    # 生产环境：只应用已有迁移（不生成）
npm run prisma:generate  # 重新生成 Prisma Client
```

## 测试

### 后端单元/集成测试

```bash
cd backend
npm test
```

需要 `jat_test` 数据库（docker-compose 已创建）。覆盖：未登录 401、注册登录后访问、越权 404、CRUD、级联删除、统计数量。

### 端到端测试

先确保后端（`:4000`）与前端（`:5173`）已启动，然后：

```bash
cd frontend
npx playwright install chromium   # 首次
npx playwright test
```

## API 简表

所有 `/api/applications*` 与 `/api/applications/:id/notes*` 均需 Session Cookie。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `ALL` | `/api/auth/*splat` | Better Auth（注册/登录/登出/会话） |
| `GET` | `/api/applications` | 列表（`status`、`q`、`page`、`pageSize`） |
| `POST` | `/api/applications` | 新建申请 |
| `GET` | `/api/applications/stats` | 仪表盘统计 |
| `GET` | `/api/applications/:id` | 单条详情（含备注/状态历史） |
| `PATCH` | `/api/applications/:id` | 编辑申请 |
| `DELETE` | `/api/applications/:id` | 删除申请（级联删除备注/状态历史） |
| `PATCH` | `/api/applications/:id/status` | 修改状态（记录 StatusHistory） |
| `GET` | `/api/applications/:id/notes` | 备注列表 |
| `POST` | `/api/applications/:id/notes` | 新增备注 |
| `DELETE` | `/api/applications/:id/notes/:noteId` | 删除备注 |

错误响应统一为 `{ "error": { "code", "message" } }`。

## 部署

- **前端**：Vercel（`frontend/vercel.json` 已配置 SPA rewrite）或 Netlify（`frontend/netlify.toml` 已配置）。
- **后端**：Render（`backend/render.yaml` 已配置）或 Railway。
- **数据库**：Neon 或 Render PostgreSQL，切换 `DATABASE_URL` 即可。

> 部署前必须设置生产环境变量：`DATABASE_URL`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`（后端公开 URL）、`CORS_ORIGIN`（前端 URL）。

## 数据模型

- `User` / `Session` / `Account` / `Verification`：Better Auth 官方模型。
- `Application`：id、userId、company、position、appliedDate、status（枚举 PENDING/INTERVIEW/REJECTED/OFFER）、source?、link?、createdAt、updatedAt。含部分唯一索引（同用户同公司同职位同日期仅允许一条 PENDING）。
- `Note`：id、applicationId、content、createdAt。
- `StatusHistory`：id、applicationId、fromStatus、toStatus、changedAt。
- 关系：User 1–N Application，Application 1–N Note / StatusHistory；删除 Application 级联删除。

## MVP 边界（明确不做）

不引入 JWT、管理员角色、第三方 OAuth、邮件通知、附件上传、看板拖拽、重型图表、多语言。
