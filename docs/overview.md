请帮我实现一个最小可行版本（MVP）的全栈项目：求职申请追踪器（Job Application Tracker）。

## 一、项目目标
帮助个人记录和跟踪求职申请进度。MVP 只服务单用户自己的数据，不做多角色、不做团队协作、不做消息通知、不做附件上传、不做第三方 OAuth。

## 二、技术栈约束
- 后端：Node.js + Express 5 + TypeScript
- 数据库：PostgreSQL
- ORM：Prisma
- 认证：Better Auth 1.6+ 的 Session 认证，Session 存储在 PostgreSQL，不使用 JWT
- 前端：React + Vite + TypeScript + Tailwind CSS
- 测试：后端用 Jest + Supertest；端到端用 Playwright
- 部署：前端 Vercel/Netlify，后端 Render/Railway，数据库用 Neon 或 Render PostgreSQL
- 代码要求：避免 any；路由按资源拆分；统一错误处理中间件；使用 .env 管理密钥；提供 .env.example

## 三、认证方案（必须严格遵守，不要改用 JWT）
- 使用 Better Auth 的 Session 认证，登录成功后由 Better Auth 自动设置 HttpOnly Session Cookie。
- Better Auth 使用 Prisma adapter，User / Session / Account / Verification 等模型按 Better Auth 官方 Prisma schema 生成或定义，Session 数据存储在 PostgreSQL。
- Express 5 中挂载 Better Auth handler 的路径必须是 /api/auth/*splat，不要使用 Express 4 的 /*。
- 不要在 Better Auth handler 之前挂载 express.json()，否则请求会卡住；业务路由的 express.json() 放在 auth handler 之后。
- 后端受保护路由通过 auth.api.getSession({ headers: fromNodeHeaders(req.headers) }) 获取当前用户；没有 session 返回 401。
- 前端使用 better-auth/client 的 authClient.useSession() 管理登录状态，不手动存 token，不使用 localStorage 存 token。
- 注册调用 authClient.signUp.email，登录调用 authClient.signIn.email，登出调用 authClient.signOut()；登出后服务端 Session 删除，立即失效。
- CORS 配置 credentials: true，前端请求携带 credentials: 'include'。
- 不要手写 /api/auth/register、/api/auth/login、/api/auth/me 业务接口；认证相关请求全部交给 Better Auth handler。
- Application 的 userId 外键关联 Better Auth 管理的 User.id。

## 四、核心功能详细规格

### 1. 用户注册 / 登录
- 前端提供注册页、登录页，调用 Better Auth 客户端方法。
- 注册字段：邮箱 + 密码 + 可选姓名；邮箱唯一；密码长度至少 8 位。
- 登录成功后保持 Session Cookie；刷新页面通过 authClient.useSession() 恢复登录状态。
- 未登录访问受保护页面自动跳转登录页。
- 未登录访问业务接口返回 401；Session 失效时前端清空状态并跳转登录。

### 2. 求职申请 CRUD
每条申请包含字段：
- id
- userId（关联 Better Auth User.id）
- company：公司名称，必填
- position：职位名称，必填
- appliedDate：投递日期，必填，ISO 日期
- status：状态枚举，必填，默认 PENDING
- source：投递渠道，可选（如 BOSS、官网、内推）
- link：职位链接，可选
- notes：备注单独建模为多条 Note，不在 Application 里存长文本
- createdAt / updatedAt

功能要求：
- 新增申请
- 编辑申请（公司、职位、日期、渠道、链接）
- 删除申请，同时级联删除该申请下的备注
- 查询列表：支持按状态筛选、按公司/职位关键词搜索、按投递日期倒序分页
- 查询单条详情
- 数据隔离：用户只能访问自己的申请；访问他人资源返回 404，不返回 403，避免泄露资源存在性
- 防重复提交：同一用户、同一公司、同一职位、同一天，不允许重复创建 PENDING 申请；用数据库唯一约束或事务保证

### 3. 状态流转
状态枚举固定为：
- PENDING（待定）
- INTERVIEW（面试）
- REJECTED（被拒）
- OFFER（Offer）

功能要求：
- 详情页和看板卡片上都可以修改状态
- 提供专用接口 PATCH /api/applications/:id/status，body: { status }
- 后端校验 status 必须是上述四个值之一
- MVP 允许任意方向流转；每次状态变更记录一条 StatusHistory，字段 id、applicationId、fromStatus、toStatus、changedAt
- 前端修改状态后，列表、看板和仪表盘统计同步更新

### 4. 备注
- 每条申请可以有多条备注
- 备注字段：id、applicationId、content（必填，1–1000 字）、createdAt
- 支持新增备注、查看备注列表、删除备注
- 备注只能由申请所属用户操作
- 前端在申请详情页展示备注时间线，提供输入框和删除按钮

### 5. 仪表盘
- 统计当前用户各状态申请数量：PENDING、INTERVIEW、REJECTED、OFFER
- 显示总申请数
- 显示最近 5 条申请
- 统计接口：GET /api/applications/stats
- 前端用卡片展示四个状态数量，用简单条形图或数字卡片即可，不引入重型图表库

### 6. 列表 / 看板视图
- 列表视图：表格或卡片列表，展示公司、职位、投递日期、状态、操作按钮
- 看板视图：四列对应四个状态，卡片展示公司 + 职位 + 日期
- MVP 看板不强制拖拽；用卡片上的状态下拉框或按钮修改状态即可
- 列表和看板共用同一份数据接口，前端做视图切换
- 支持空状态提示和加载状态

## 五、API 端点
认证（由 Better Auth 处理，不要手写）：
- ALL /api/auth/*splat 交给 Better Auth handler

申请（全部受 Session 保护）：
- GET /api/applications?status=&q=&page=&pageSize=
- POST /api/applications
- GET /api/applications/:id
- PATCH /api/applications/:id
- DELETE /api/applications/:id
- PATCH /api/applications/:id/status
- GET /api/applications/stats

备注（全部受 Session 保护）：
- GET /api/applications/:id/notes
- POST /api/applications/:id/notes
- DELETE /api/applications/:id/notes/:noteId

所有申请和备注接口都必须从 Better Auth Session 获取 userId，并在查询条件中带 userId。

## 六、数据模型（Prisma 建议）
- Better Auth 管理的模型：User、Session、Account、Verification，按 Better Auth 官方 Prisma schema 定义。
- Application: id, userId, company, position, appliedDate, status, source?, link?, createdAt, updatedAt；索引 userId + status、userId + appliedDate；userId 外键关联 User.id。
- Note: id, applicationId, content, createdAt；索引 applicationId。
- StatusHistory: id, applicationId, fromStatus, toStatus, changedAt；索引 applicationId。

关系：
- User 1–N Application
- Application 1–N Note
- Application 1–N StatusHistory
- 删除 Application 时级联删除 Note 和 StatusHistory

## 七、前端页面
- /login 登录页
- /register 注册页
- /dashboard 仪表盘：状态统计卡片 + 最近申请
- /applications 列表/看板切换页
- /applications/new 新建申请
- /applications/:id 详情页：编辑、改状态、备注时间线、状态历史
- 顶部导航：Dashboard、Applications、退出登录
- 未登录路由守卫；Session 失效时跳登录

## 八、非功能要求
- 统一错误响应格式：{ error: { code, message } }
- 后端输入校验，可用 zod 或 express-validator
- CORS 只允许前端域名，并配置 credentials: true
- JWT_SECRET 不需要；Better Auth secret 从环境变量读取，不写死在代码里
- 提供 README：启动方式、环境变量、Better Auth 配置、数据库迁移、测试命令、API 简表
- 提供 seed 脚本：创建一个测试用户和 5 条不同状态的申请，方便演示
- 代码提交到 GitHub，提交记录清晰

## 九、测试要求
- 后端 Jest + Supertest 至少覆盖：
  - 未登录访问业务接口返回 401
  - 注册登录后携带 Session Cookie 可以访问业务接口
  - 用户 A 不能读取用户 B 的申请（返回 404）
  - 创建申请、修改状态、删除申请
  - 删除申请时备注和状态历史级联删除
  - 仪表盘统计数量正确
- 测试中使用 supertest.agent 保持 Cookie，先调用 Better Auth 注册/登录，再访问业务接口
- Playwright 至少覆盖 3 条 E2E：
  - 注册 → 登录 → 创建申请 → 看板看到卡片
  - 修改状态 → 仪表盘统计变化
  - 添加备注 → 详情页看到备注

## 十、验收标准
- 本地 npm install 后按 README 能启动前后端
- 注册登录可用，刷新后保持登录，登出后受保护页面立即失效
- 能创建、编辑、删除申请；列表和看板数据一致
- 状态修改后仪表盘统计正确
- 备注可增删，且只能操作自己的数据
- 越权访问返回 404
- 后端测试和 Playwright 测试通过
- 前端和后端都能部署，提供在线地址

## 十一、明确不做（MVP 边界）
- 不使用 JWT
- 不做管理员角色
- 不做第三方 OAuth
- 不做邮件通知
- 不做附件上传
- 不做拖拽排序（看板用下拉改状态即可）
- 不做复杂图表
- 不做多语言

## 十二、实现顺序
1. 初始化前后端两个目录
2. 配置 Better Auth + Prisma adapter，生成/定义 User、Session、Account、Verification 模型并迁移
3. 完成后端 Session 中间件、申请 CRUD、备注、状态历史、统计接口和 Jest 测试
4. 完成 React 前端页面、authClient.useSession() 路由守卫
5. 补 Playwright E2E、README、seed 和部署配置
每完成一步，告诉我改了哪些文件、如何运行、还有哪些未完成。

如果 Better Auth 集成遇到问题，不要退回 JWT；先检查 Express 5 的 /api/auth/*splat 挂载路径、express.json() 顺序、CORS credentials 和前端 credentials: 'include'。