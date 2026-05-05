# AGENTS.md - 数智工具箱开发手册

> 目标：基于现有 COOL Admin + Electron 基座，逐步实现一个“后台可管理、桌面端可使用”的数智工具箱。

## 1. 当前目标与进度

### 产品目标
- 桌面端：工具浏览、搜索、收藏、打开、最近使用、离线缓存。
- 后台端：管理工具分类、工具信息、入口地址、排序、状态、推荐位、基础统计、用户、消息。
- 后端：提供工具配置、收藏、使用记录、统计、登录鉴权、站内消息接口。

### MVP 范围
- 支持工具类型：`external_link` 外部链接、`internal_web` 内置 Web 工具、`local_plugin` 本地插件预留。
- 首批内置工具：JSON 格式化、Base64 编解码、URL 编码/解码、文本去重、Markdown 预览、时间戳转换。
- 下一阶段：手机号密码登录、按工具配置访问权限、站内信与系统通知。
- 暂缓：插件市场、第三方插件沙箱、插件自动更新、任意本地命令执行、移动端适配。

### 进度跟踪
| 阶段 | 状态 | 目标 |
| --- | --- | --- |
| P0 文档与规则 | 已完成 | 精简本文件，作为后续 AI 开发入口 |
| P1 数据库与后端模块 | 已完成 | MySQL 配置、`toolbox` 模块、实体、接口、默认数据 |
| P2 后台管理端 | 已完成 | 分类管理、工具管理、基础统计 |
| P3 Electron 首页 UI | 已完成 | 深色科技风首页、工具卡片、分类、搜索、收藏 |
| P4 桌面端数据接入 | 已完成 | 首页接口、工具列表、缓存、收藏、使用记录 |
| P5 内置工具 | 已完成 | 6 个内置工具页面和内部路由 |
| P6 验证与收敛 | 已完成 | typecheck、build、启动验证 |
| P7 登录与访问权限 | 已完成 | APP 用户登录、token 注入、工具级访问控制 |
| P8 消息通知 | 已完成 | 后台消息管理、桌面端站内信、系统通知 |

## 2. 项目结构与技术栈

```text
brmtool/
├── cool-service-master/
│   ├── api/   # Midway.js + COOL Admin + TypeORM 后端
│   └── vue/   # Vue 3 + Element Plus + COOL Admin 管理端
├── cool-electron/  # Electron + electron-vite + Vue 3 + Naive UI 桌面端
├── cool-uni-8.x/   # UniApp，MVP 暂不改
└── agent.md        # 本文件
```

### 固定技术选择
- 后端：Midway.js 3.20.x、`@cool-midway/core` 8.x、TypeORM 0.3.20、TypeScript 5.8。
- 管理端：Vue 3.5、Element Plus 2.10、Pinia、Vite 5.4、`@cool-vue/crud`。
- 桌面端：Electron、electron-vite 2.x、Vue 3、TypeScript、Naive UI。
- 包管理器：统一使用 `pnpm`。
- 文档查询：涉及库、框架、SDK、CLI、云服务用法时，先用 `ctx7` CLI 获取当前文档。

## 3. 本地数据库约定

- 开发数据库统一使用本机 MySQL，不使用默认 SQLite 作为正式开发库。
- 默认库名：`brmtool`；字符集：`utf8mb4`。
- 本地配置入口：`cool-service-master/api/src/config/config.local.ts`。
- 只允许操作本机新建的开发库；禁止连接生产库；禁止提交数据库账号、密码、`.env`。

```sql
CREATE DATABASE brmtool DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 4. 常用命令

```bash
# 后端
cd cool-service-master/api
pnpm dev
pnpm test
pnpm lint
pnpm build

# 管理端
cd cool-service-master/vue
pnpm dev
pnpm type-check
pnpm build

# 桌面端
cd cool-electron
pnpm dev
pnpm typecheck
pnpm build

# 前后端一键启动
cd cool-service-master
node start-dev.js
```

## 5. 开发硬约束

### 必须
- 新业务按模块组织：后端 `src/modules/toolbox`，管理端 `src/modules/toolbox`，Electron main 能力放 `src/main/<module>/index.ts`。
- 外部 API、文件、本地能力调用必须做错误处理。
- 提交前运行当前阶段最相关检查：后端 `pnpm test`/`pnpm lint`，管理端 `pnpm type-check`/`pnpm build`，桌面端 `pnpm typecheck`。
- Electron preload 只暴露白名单 API。

### 先问再改
- 修改配置文件、数据库 schema、依赖版本、Docker、CI、跨子项目大改。
- 删除现有功能或改变已有模块行为。

### 禁止
- 硬编码密钥、提交 `.env`、提交构建产物或本地缓存。
- 改生产配置或连接生产数据库。
- 在 `cool-electron/src/main/index.ts` 写业务逻辑。
- Renderer 直接执行 shell 或任意本地命令。

## 6. 后端设计摘要

后端新增模块：`cool-service-master/api/src/modules/toolbox`。

### 实体
- `ToolboxCategoryEntity`：`name`、`code`、`icon`、`sort`、`status`、`remark`。
- `ToolboxToolEntity`：`categoryId`、`name`、`code`、`description`、`icon`、`type`、`entry`、`openMode`、`tags`、`keywords`、`isRecommend`、`isHot`、`isNew`、`sort`、`status`、`version`、`config`、`remark`。
- `ToolboxFavoriteEntity`：`userId`、`toolId`，同一用户同一工具唯一。
- `ToolboxUsageEntity`：`userId`、`toolId`、`toolName`、`action=open`、`clientType=electron`、`createdAt`。
- 下一阶段 `ToolboxToolEntity` 增加 `authRequired`：`0=公开`，`1=登录后可用`，默认公开。
- 下一阶段新增消息模块：`MessageInfoEntity` 保存标题、内容、等级、目标范围、跳转动作、发布时间、状态；`MessageReadEntity` 保存 `messageId + userId` 已读状态。

### 接口
- 管理端：分类 CRUD、工具 CRUD、启停/推荐/热门/最新/排序、使用统计。
- 登录：复用 APP 用户体系，桌面端用 `/app/user/login/password` 和 `/app/user/info/person`。
- 消息：
  - `GET /app/message/list`
  - `GET /app/message/unreadCount`
  - `POST /app/message/read`
  - `POST /app/message/readAll`
- 桌面端：
  - `GET /app/toolbox/home`
  - `GET /app/toolbox/tools`
  - `GET /app/toolbox/tools/:id`
  - `POST /app/toolbox/favorite`
  - `POST /app/toolbox/usage`

### 安全
- 外部链接只允许 `http`、`https`。
- `local_plugin` 第一阶段只保存配置，不执行命令。
- 收藏和使用记录绑定当前用户。
- Electron Main 请求后端必须走白名单 IPC，允许 `/app/toolbox/**`、`/app/user/**`、`/app/message/**`，并自动注入 `Authorization`。
- 未登录用户只能打开公开工具；受保护工具必须由后端和桌面端同时拦截。

## 7. 管理端设计摘要

管理端新增模块：`cool-service-master/vue/src/modules/toolbox`，优先复用 `@cool-vue/crud`。

- 分类管理：名称、编码、图标、排序、状态、备注。
- 工具管理：名称、分类、类型、入口、打开方式、图标、标签、关键词、推荐位、排序、状态、版本、配置 JSON。
- 使用统计：今日打开次数、总打开次数、热门工具排行、用户使用排行。
- APP 用户管理：后台创建或维护手机号、昵称、状态、密码；密码保存前统一加密，避免明文无法登录。
- 消息管理：创建、编辑、发布、下线消息；支持全体用户和指定用户；可配置消息等级、跳转动作。
- 表单要求：类型和打开方式用下拉；`config` 做 JSON 格式校验；`entry` 根据类型展示提示。
- 工具表单新增访问权限：公开访问、登录后访问。

## 8. Electron 桌面端设计摘要

### 页面
- 首页：顶部搜索、欢迎 banner、我的收藏、推荐工具、今日使用、最近使用。
- 工具列表：分类筛选、关键词搜索、最新/最热/收藏最多排序。
- 工具运行页：承载内置工具或可嵌入工具。
- 我的区域：未登录显示登录入口；已登录显示用户信息、退出登录、同步状态。
- 消息通知：顶部通知入口展示未读数，消息抽屉展示列表和详情；重要消息触发系统通知。

### 数据流
- 启动时请求 `/app/toolbox/home`；成功后写本地缓存。
- 启动时恢复本地登录态；接口请求由 Main 进程统一注入 token；token 失效时尝试 refresh，失败则静默退出登录。
- 接口失败时读取缓存；无缓存时展示内置默认工具。
- 未登录收藏只保留本地临时状态；登录后收藏同步到后端。
- 打开工具后记录 `/app/toolbox/usage`，并更新本地最近使用和今日次数。
- 点击受保护工具时，未登录先弹登录框；登录成功后继续打开原工具。
- 消息默认 60 秒轮询一次；新重要消息调用现有 `notification:send`。

### 打开方式
- `external_browser`：主进程 `shell.openExternal`。
- `electron_window`：主进程创建独立工具窗口。
- `embedded_webview`：后续按安全策略评估。
- `internal_route`：Renderer 内部路由。

## 9. 分阶段实施清单

### P1 数据库与后端模块
- [x] 新建本机 MySQL 数据库 `brmtool`。
- [x] 将 `config.local.ts` 从 SQLite 切到本机 MySQL。
- [x] 新增 `toolbox` 后端模块、实体、service、controller。
- [x] 初始化默认分类和 6 个内置工具配置。
- [x] 完成管理端 CRUD 接口和桌面端 app 接口。
- [x] 运行后端检查。

### P2 后台管理端
- [x] 新增 `toolbox` 管理端模块。
- [x] 实现分类管理页面。
- [x] 实现工具管理页面。
- [x] 实现基础统计页面。
- [x] 运行管理端检查。

### P3 Electron 首页 UI
- [x] 重构桌面端首页为工具箱布局。
- [x] 实现左侧导航、顶部搜索、banner、收藏区、推荐区。
- [x] 抽取工具卡片、分类导航、统计卡片组件。
- [x] 运行桌面端 typecheck。

### P4 桌面端数据接入
- [x] 接入首页和工具列表接口。
- [x] 实现本地缓存和离线降级。
- [x] 实现收藏/取消收藏。
- [x] 实现打开工具和使用记录。

### P5 内置工具
- [x] JSON 格式化。
- [x] Base64 编解码。
- [x] URL 编码/解码。
- [x] 文本去重。
- [x] Markdown 预览。
- [x] 时间戳转换。

### P6 验证与收敛
- [x] 后端 API 可启动并连接 MySQL。
- [x] 管理端可维护工具分类和工具。
- [x] 桌面端可展示、搜索、收藏、打开工具。
- [x] 后端不可用时桌面端可用缓存或默认工具。
- [x] 当前阶段相关检查通过。

### P7 登录与访问权限
- [x] 后端补齐 APP 用户后台密码保存加密。
- [x] 工具表新增 `authRequired` 并接入工具管理筛选和表单。
- [x] 后端工具详情、收藏、使用记录增加登录态和访问权限处理。
- [x] Electron 增加登录态服务、token/refreshToken 缓存、退出登录。
- [x] Main 进程新增统一 APP 请求白名单和 token 注入。
- [x] 桌面端“我的”区域改为登录入口/用户菜单。
- [x] 未登录点击受保护工具时弹出登录框，登录成功后继续打开。

### P8 消息通知
- [x] 后端新增 `message` 模块、消息表、已读表、APP 消息接口。
- [x] 后台新增消息管理页面，支持草稿、发布、下线。
- [x] Electron 顶部新增通知入口、未读数、消息抽屉、消息详情。
- [x] 桌面端轮询未读消息，重要消息触发系统级通知。
- [x] 验证全体消息、指定用户消息、已读状态隔离。

### P6 验证记录
- 后端：`pnpm lint`、`pnpm build` 通过；本机 MySQL 下 `/app/toolbox/home`、工具列表、工具详情返回正常。
- 管理端：`pnpm type-check`、`pnpm build` 通过；在线 EPS 可识别 `toolbox` 模块。
- 桌面端：`pnpm typecheck`、`pnpm build` 通过；`pnpm dev` 可启动 Electron main/preload/renderer。
- 安全：未发现数据库密码写入源码；临时后端/Electron 验证进程已关闭。

### P7/P8 验证记录
- 后端：`pnpm build` 通过；`pnpm lint` 通过。
- 管理端：`pnpm type-check`、`pnpm build` 通过。
- 桌面端：`pnpm typecheck`、`pnpm build` 通过。
- 说明：后端 `pnpm build` 会生成临时 `src/index.ts`，验证后已移除该生成文件，避免提交构建产物。

## 10. 验收标准

- 后端连接本机 MySQL，工具分类、工具信息、收藏、使用记录可用。
- 后台可以管理分类、工具、状态、排序、推荐位和基础统计。
- 桌面端具备深色科技工具箱首页，可搜索、收藏、打开外链和内置工具。
- 登录后收藏、使用记录、受保护工具访问、个人消息可同步到后端。
- 后台可维护 APP 用户、工具访问权限和站内消息。
- 桌面端可展示未读消息，并对重要消息触发系统通知。
- 代码遵循现有 CoolAdmin / Electron 风格，不引入无必要依赖，不破坏已有模块。
