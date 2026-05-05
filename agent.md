# AGENTS.md - 数智工具箱开发手册

> 目标：基于现有 COOL Admin + Electron 基座，逐步实现一个“后台可管理、桌面端可使用”的数智工具箱。

## 1. 当前目标与进度

### 产品目标
- 桌面端：工具浏览、搜索、收藏、打开、最近使用、离线缓存。
- 后台端：管理工具分类、工具信息、入口地址、排序、状态、推荐位、基础统计、用户、消息。
- 后端：提供工具配置、收藏、使用记录、统计、登录鉴权、站内消息接口。

### MVP 范围
- 核心 MVP 已完成：工具管理、桌面首页、搜索、收藏、打开工具、使用统计、本地缓存。
- 扩展 MVP 已完成：登录权限、消息通知、留言板插件、内嵌 WebView、软件下载页、桌面端在线更新。
- 支持工具类型：`external_link` 外部链接、`internal_web` 内置 Web 工具、`local_plugin` 本地插件。
- 首批内置工具已完成：JSON 格式化、Base64 编解码、URL 编码/解码、文本去重、Markdown 预览、时间戳转换。
- 下一阶段：P13 上线交付收敛，聚焦真实域名部署、CI/Windows 打包、在线更新全链路验证和发布检查。
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
| P9 上线部署准备 | 已完成 | 生产 env、Nginx 示例、后端/管理端/桌面端入口配置 |
| P10 桌面端在线更新 | 已完成 | electron-updater、更新检查、自动下载、提示安装、更新产物配置 |
| P11 插件化与内嵌浏览体验 | 已完成 | 留言板本地插件、工具管理统一入口、内嵌 WebView 全屏自适应、侧栏折叠 |
| P12 软件下载页 | 已完成 | `/download` 公开下载单页、系统识别 macOS/Windows、下载地址环境变量配置 |
| P13 上线交付收敛 | 进行中 | 域名配置脚本、发布检查、CI/Windows 打包、更新链路验证 |
| P14 上线后运营增强 | 进行中 | 运营路线图、数据看板、插件体系、后台配置化增强 |

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
pnpm build:mac --publish never
pnpm build:win --publish never

# 前后端一键启动
cd cool-service-master
node start-dev.js

# 发布产物约定
# 管理端静态资源部署到 https://<DEPLOY_DOMAIN>/
# 后端接口由 Nginx 反代到 https://<DEPLOY_DOMAIN>/api
# 桌面端更新包上传到 https://<DEPLOY_DOMAIN>/updates/desktop
# 软件下载页公开访问 https://<DEPLOY_DOMAIN>/download
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
- 提交真实上线域名密钥、数据库密码、签名证书、发布 token。

## 6. 后端设计摘要

后端新增模块：`cool-service-master/api/src/modules/toolbox`。

### 实体
- `ToolboxCategoryEntity`：`name`、`code`、`icon`、`sort`、`status`、`remark`。
- `ToolboxToolEntity`：`categoryId`、`name`、`code`、`description`、`icon`、`type`、`entry`、`openMode`、`tags`、`keywords`、`isRecommend`、`isHot`、`isNew`、`authRequired`、`sort`、`status`、`version`、`config`、`remark`。
- `ToolboxFavoriteEntity`：`userId`、`toolId`，同一用户同一工具唯一。
- `ToolboxUsageEntity`：`userId`、`toolId`、`toolName`、`action=open`、`clientType=electron`、`createdAt`。
- `ToolboxFeedbackEntity`：留言板插件数据，保存用户建议、联系方式、处理状态和回复内容。
- `MessageInfoEntity`：保存标题、内容、等级、目标范围、跳转动作、发布时间、状态。
- `MessageReadEntity`：保存 `messageId + userId` 已读状态。

### 接口
- 管理端：分类 CRUD、工具 CRUD、启停/推荐/热门/最新/排序、使用统计。
- 登录：复用 APP 用户体系，桌面端用 `/app/user/login/password` 和 `/app/user/info/person`。
- 留言板：桌面端提交我的建议，后台查看、更新、删除留言数据。
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
- 工具排序统一按 `sort` 数字倒序展示，数字越大越靠前；后台工具列表和桌面端工具列表保持一致。

## 7. 管理端设计摘要

管理端新增模块：`cool-service-master/vue/src/modules/toolbox`，优先复用 `@cool-vue/crud`。

- 分类管理：名称、编码、图标、排序、状态、备注。
- 工具管理：名称、分类、类型、入口、打开方式、图标、标签、关键词、推荐位、排序、状态、版本、配置 JSON；工具列表按 `sort` 倒序展示。
- 使用统计：今日打开次数、总打开次数、热门工具排行、用户使用排行、用户具体工具使用明细。
- APP 用户管理：后台创建或维护手机号、昵称、状态、密码；密码保存前统一加密，避免明文无法登录。
- 消息管理：创建、编辑、发布、下线消息；支持全体用户和指定用户；可配置消息等级、跳转动作。
- 留言板管理：留言板作为 `local_plugin` 工具统一出现在工具管理中，工具行提供留言数据入口。
- 表单要求：类型和打开方式用下拉；`config` 做 JSON 格式校验；`entry` 根据类型展示提示。
- 工具表单新增访问权限：公开访问、登录后访问。

## 8. Electron 桌面端设计摘要

### 页面
- 首页：顶部搜索、欢迎 banner、我的收藏、推荐工具、今日使用、最近使用。
- 工具列表：分类筛选、关键词搜索、最新/最热/收藏最多排序。
- 工具运行页：承载内置工具或可嵌入工具。
- 我的区域：未登录显示登录入口；已登录显示用户信息、退出登录、同步状态。
- 消息通知：顶部通知入口展示未读数，消息抽屉展示列表和详情；重要消息触发系统通知。
- 软件下载页：管理端提供 `/download` 公开单页，根据系统展示 macOS/Windows 下载入口。

### 数据流
- 启动时请求 `/app/toolbox/home`；成功后写本地缓存。
- 启动时恢复本地登录态；接口请求由 Main 进程统一注入 token；token 失效时尝试 refresh，失败则静默退出登录。
- 接口失败时读取缓存；无缓存时展示内置默认工具。
- 工具列表、本地缓存和默认工具合并后按 `sort` 倒序展示。
- 未登录收藏只保留本地临时状态；登录后收藏同步到后端。
- 打开工具后记录 `/app/toolbox/usage`，并更新本地最近使用和今日次数。
- 点击受保护工具时，未登录先弹登录框；登录成功后继续打开原工具。
- 消息默认 60 秒轮询一次；新重要消息调用现有 `notification:send`。

### 打开方式
- `external_browser`：主进程 `shell.openExternal`。
- `electron_window`：主进程创建独立工具窗口。
- `embedded_webview`：桌面端内嵌 WebView 打开，提供返回、刷新、返回首页、关闭和地址栏。
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

### P9 上线部署准备
- 前置输入：真实域名、服务器系统、Node 版本、MySQL 地址、部署目录、HTTPS 证书来源。
- 部署形态：采用同域名分路径，`https://<DEPLOY_DOMAIN>/` 为管理端，`/api` 为后端接口，`/updates/desktop` 为桌面端更新包静态目录。
- [x] 后端生产入口：`config.prod.ts` 改为读取环境变量 `BRMTOOL_PORT`、`BRMTOOL_DB_HOST`、`BRMTOOL_DB_PORT`、`BRMTOOL_DB_USER`、`BRMTOOL_DB_PASSWORD`、`BRMTOOL_DB_NAME`。
- [x] 后端生产安全：保持 `synchronize=false`、`eps=false`、`initDB=false`、`initMenu=false`；禁止生产自动同步表结构。
- [x] 后端环境示例：新增 `cool-service-master/api/.env.production.example`，只写变量名和占位值，不提交真实密码、JWT secret、证书、token。
- [x] Nginx 反代规则：`/api/*` rewrite 到后端根路径，保证现有 `/admin/**`、`/app/**` 接口代码不改路径。
- [x] Nginx 静态目录：管理端 `dist` 指向站点根路径，桌面端更新包目录指向 `/updates/desktop`，并允许 `.yml`、`.blockmap`、`.exe`、`.dmg`、`.zip` 下载。
- [x] 管理端生产入口：生产 `baseUrl='/api'`，移除或替换 `show.cool-admin.com` 示例目标；增加 `VITE_PUBLIC_ORIGIN=https://<DEPLOY_DOMAIN>` 或同等环境变量说明。
- [x] Electron API 入口：Main 进程统一从 `BRMTOOL_API_BASE` 读取后端地址；本地默认 `http://127.0.0.1:8001`，生产默认 `https://deploy-domain.example/api`，上线前替换真实域名。
- [x] Electron 安全边界：保留 APP 请求 IPC 白名单，只允许 `/app/toolbox/**`、`/app/user/**`、`/app/message/**`，Renderer 不允许传入任意后端 base URL。
- [x] 构建配置：更新 `electron-builder.yml` 的 `appId`、`productName`、artifactName、`publish.provider=generic`、`publish.url=https://deploy-domain.example/updates/desktop`。
- [x] 部署文档：补充发布步骤，包含后端构建启动、管理端构建上传、更新包上传、回滚方式和健康检查 URL。

### P10 桌面端在线更新
- 更新策略：首版采用 `electron-updater + electron-builder generic provider`；启动后自动检查，发现新版本自动下载，下载完成后提示用户重启安装。
- 平台范围：首发 macOS + Windows；Linux 不作为本阶段验收目标。
- [x] 增加依赖：`electron-updater`、`electron-log`，保存更新日志，方便定位线上更新失败。
- [x] Main 模块：新增 `cool-electron/src/main/updater/index.ts`，封装 `checkForUpdates`、下载进度、错误、完成、`quitAndInstall`。
- [x] 主进程接入：在 `cool-electron/src/main/index.ts` 只注册 updater 模块，不堆业务逻辑。
- [x] IPC 白名单：Preload 暴露 `checkForUpdates`、`installUpdate`、`onUpdateStatus`，Renderer 只能调用这些更新能力。
- [x] Renderer UI：在顶部和“我的”菜单增加“检查更新”，用现有深色模态框展示当前版本、最新版本、下载进度、错误和安装按钮。
- [x] 用户体验：自动下载时不阻塞工具使用；下载完成弹出“立即重启安装 / 稍后”；稍后安装保留入口。
- [x] 发布产物：macOS 已配置生成 `latest-mac.yml`、dmg、zip、blockmap；Windows 配置生成 NSIS 安装包、`latest.yml` 和 blockmap。
- [x] 回滚策略：保留上一版更新包和元数据备份；如新版本异常，恢复旧版 `latest*.yml` 指向稳定版本。

### P11 插件化与内嵌浏览体验
- [x] 新增留言板本地插件：登录用户可在桌面端提交使用建议，后台可查看、更新、删除留言数据。
- [x] 留言板统一作为工具/插件处理：在工具管理列表中显示 `feedback-board` 工具，不再作为独立顶部按钮入口。
- [x] 后台工具管理中，留言板行提供“留言数据”操作入口；菜单中的使用建议页作为隐藏路由保留。
- [x] 后端提供留言板工具自动创建能力；已有工具记录不覆盖，避免管理员修改后被重置。
- [x] 桌面端外链支持 `embedded_webview` 内嵌打开，提供返回、刷新、返回首页、关闭和地址栏。
- [x] WebView 运行区使用“顶部栏 + 剩余空间舞台”布局；通过 `ResizeObserver` 同步真实像素尺寸，确保窗口全屏、缩放、侧栏折叠时网页区域自适应。
- [x] 左侧菜单支持手动折叠，并将折叠状态保存到本地。
- [x] 优化桌面端工具卡收藏按钮、侧栏边界、统计卡边界，避免按钮偏移和菜单撑出。

### P12 软件下载页
- [x] 管理端前端新增公开 page：`/download`，加入 `ignore.token`，未登录也可访问。
- [x] 页面不进入后台主布局，采用深色科技风首屏、产品介绍、桌面端视觉和平台下载卡片。
- [x] 主下载按钮根据 `navigator.userAgent` / `navigator.platform` 自动识别 macOS 或 Windows。
- [x] 未识别系统时不自动指向任意平台，提示用户在平台卡片中手动选择。
- [x] 下载地址通过环境变量配置：`VITE_DESKTOP_DOWNLOAD_MAC_URL`、`VITE_DESKTOP_DOWNLOAD_WINDOWS_URL`。
- [x] `.env.production.example` 补充下载地址示例，建议指向 `/updates/desktop` 下的静态安装包别名。
- [x] 下载页不调用后端接口，不新增数据库表，不影响管理端登录和后台功能。

### P13 上线交付收敛
- 目标：把已完成 MVP 从本地开发态收敛为可内测上线的发布链路。
- [ ] 确认真实上线域名、部署目录、HTTPS 证书、Node/MySQL 版本。
- [x] 新增 `scripts/configure-deploy.mjs`，用 `DEPLOY_DOMAIN` 批量替换后端、管理端、Electron、Nginx、发布文档中的生产占位域名。
- [x] 新增 `scripts/check-release-config.mjs`，检查占位域名、敏感 env、更新包元数据和安装包目录。
- [x] 新增 GitHub Actions `Desktop Build` 工作流，可在 macOS/Windows runner 产出桌面端安装包和更新元数据。
- [ ] 使用真实域名运行配置脚本，替换生产占位域名：后端、管理端、Electron API base、electron-builder publish URL、下载页地址。
- [ ] 使用生产 env 启动后端，验证 `/api/app/toolbox/home`、`/api/admin/base/open/eps`。
- [ ] 部署管理端静态资源，验证登录、工具管理、消息管理、使用统计、下载页都走 `/api`。
- [ ] 建立 Windows 或 CI 打包环境，补跑 Windows 安装包构建。
- [ ] 本地或测试服务器模拟 `/updates/desktop`，验证旧版本升级到新版本。
- [ ] 上传 macOS/Windows 安装包、`latest*.yml`、blockmap，并记录回滚方式。
- [ ] 明确正式发布签名策略：内测可先 unsigned，公开发布前补齐 macOS 签名/公证和 Windows 代码签名。

### P14 上线后运营增强
- [x] 新增 `docs/operations/p14-roadmap.md`，明确上线后运营增强路线图和暂缓边界。
- [ ] 运营数据看板：在现有使用统计基础上补充时间范围筛选、趋势图、工具转化排行、导出字段配置。
- [ ] 下载页配置化：将 macOS/Windows 下载地址、版本号、更新说明从环境变量升级为后台配置。
- [ ] 消息触达增强：支持按用户、工具使用行为、最近活跃时间筛选发送站内信。
- [ ] 留言板运营闭环：增加处理人、处理耗时、常见反馈分类和状态筛选。
- [ ] 插件体系准备：定义插件元信息、权限说明、运行入口、配置 schema 和审核状态。

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

### P13 验证计划
- 配置检查：搜索确认生产代码不再残留 `show.cool-admin.com`、`https://example.com/auto-updates`、生产数据库示例密码和真实密钥。
- 后端：`pnpm lint`、`pnpm build`；使用生产环境变量启动一次，验证 `/api/app/toolbox/home`、`/api/admin/base/open/eps` 经 Nginx 可达。
- 管理端：`pnpm type-check`、`pnpm build`；部署静态产物后验证登录、工具管理、消息管理、使用统计接口都走 `/api`。
- 桌面端：`pnpm typecheck`、`pnpm build`、`pnpm build:mac --publish never`；Windows 打包在 CI 或 Windows 机器补跑。
- 更新链路：本地模拟 update server，验证检查更新、下载进度、下载完成提示、稍后安装、立即安装 IPC 流程。
- 发布验证：安装旧版本客户端，确认能发现新版本、自动下载、提示重启安装并升级成功；验证失败时可回滚到上一版元数据。

### P9/P10 验证记录
- 后端：`pnpm build`、`pnpm lint` 通过；构建生成的临时 `src/index.ts` 已移除。
- 管理端：`pnpm type-check`、`pnpm build` 通过；本地 API 未启动时 EPS 在线刷新会提示失败，但构建可使用已有 EPS 完成。
- 桌面端：`pnpm typecheck`、`pnpm build`、`pnpm build:mac --publish never` 通过。
- macOS 打包：已生成 dmg、zip 和 blockmap；本机无 Apple Developer ID，当前未签名。
- Windows 打包：`pnpm build:win --publish never` 在 Apple Silicon Mac 上失败于 `wine64: bad CPU type in executable`，需在 Windows 机器或 CI 补跑。
- 配置搜索：后端/管理端/Electron 生产入口已移除 `show.cool-admin.com`、`https://example.com/auto-updates`、生产数据库示例密码。

### P11/P12 验证记录
- 后端：`pnpm build`、`pnpm lint` 通过；构建生成的临时 `src/index.ts` 已移除。
- 管理端：`pnpm type-check`、`pnpm build` 通过；`/download` 已生成独立下载页 chunk。
- 桌面端：`pnpm typecheck`、`pnpm build` 通过。
- 说明：Windows 安装包与在线更新完整链路已纳入 P13 上线交付收敛。

## 10. 验收标准

- 后端连接本机 MySQL，工具分类、工具信息、收藏、使用记录可用。
- 后台可以管理分类、工具、状态、排序、推荐位和基础统计。
- 桌面端具备深色科技工具箱首页，可搜索、收藏、打开外链和内置工具。
- 登录后收藏、使用记录、受保护工具访问、个人消息可同步到后端。
- 后台可维护 APP 用户、工具访问权限和站内消息。
- 桌面端可展示未读消息，并对重要消息触发系统通知。
- 上线后管理端、后端和桌面端统一指向 `https://<DEPLOY_DOMAIN>` 同域名分路径。
- 桌面端 macOS + Windows 安装包可通过 `/updates/desktop` 完成在线更新。
- 软件下载页 `/download` 可公开访问，并按系统展示 macOS/Windows 下载入口。
- 留言板作为本地插件统一出现在工具管理和桌面端工具体系中。
- 内嵌 WebView 网页可在桌面端主内容区全屏自适应展示。
- 代码遵循现有 CoolAdmin / Electron 风格，不引入无必要依赖，不破坏已有模块。
