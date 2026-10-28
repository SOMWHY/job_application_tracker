# jat-backend

求职申请追踪器后端：Express 5 + TypeScript + Prisma + Better Auth（Session 认证）。

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL 连接串 |
| `BETTER_AUTH_SECRET` | ✅ | Better Auth 签名密钥（`openssl rand -base64 32`） |
| `BETTER_AUTH_URL` | ❌ | 后端自身公开 URL，默认 `http://localhost:4000` |
| `CORS_ORIGIN` | ❌ | 允许的前端源，默认 `http://localhost:5173` |
| `PORT` | ❌ | 端口，默认 `4000` |
| `NODE_ENV` | ❌ | `development` / `test` / `production` |

本地开发可用根目录的 `docker compose up -d` 起 PostgreSQL（端口 `5433`）：

```
DATABASE_URL="postgresql://jat:jat_dev_password@localhost:5433/jat_dev?sslmode=disable"
```

## 命令

```bash
npm install              # 安装依赖
npm run dev              # tsx watch 开发启动（:4000）
npm run build            # tsc 编译到 dist/
npm start                # node dist/index.js
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:migrate   # 开发迁移（生成 + 应用）
npm run prisma:deploy    # 只应用已有迁移（生产）
npm run seed             # 创建演示用户 + 5 条申请
npm test                 # Jest + Supertest 集成测试
```

## 测试

```bash
npm test
```

测试使用 `TEST_DATABASE_URL`（默认 `localhost:5433/jat_test`），在 `src/test/setup-env.ts` 中设置；`src/test/global-setup.ts` 会先对测试库执行 `prisma migrate deploy`。

覆盖场景：

- 未登录访问业务接口返回 401
- 注册登录后携带 Session Cookie 可访问
- 用户 A 不能读取用户 B 的申请（404）
- 创建 / 修改状态 / 删除申请
- 删除申请级联删除备注与状态历史
- 仪表盘统计数量正确
- 防重复提交（同一用户/公司/职位/日期仅一条 PENDING，409）

## 结构

```
src/
├── index.ts                # app 工厂 + 启动入口
├── auth.ts                 # Better Auth 实例
├── db.ts                   # Prisma 单例
├── env.ts                  # 环境变量校验
├── lib/errors.ts           # AppError + errors 工厂
├── middleware/
│   ├── error.ts            # 统一错误处理（含 P2002 -> 409）
│   └── requireAuth.ts      # Session 校验中间件
├── routes/
│   ├── applications.ts     # 申请 CRUD + 统计 + 状态流转
│   └── notes.ts            # 备注 CRUD
├── schemas/application.ts  # zod 输入校验
└── test/                   # Jest 测试
prisma/
├── schema.prisma           # 数据模型
├── migrations/             # 迁移文件
└── seed.ts                 # seed 脚本
```

## API

见根目录 `README.md` 的「API 简表」。
