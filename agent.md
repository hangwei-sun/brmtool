# AGENTS.md - 数智工具箱开发手册

> 目标：基于现有 COOL Admin + Electron 基座，逐步实现一个“后台可管理、桌面端可使用”的数智工具箱。

## 1. 当前目标与进度

### 产品目标
- 桌面端：工具浏览、搜索、收藏、打开、最近使用、离线缓存。
- 后台端：管理工具分类、工具信息、入口地址、排序、状态、推荐位、基础统计、用户、消息。
- 后端：提供工具配置、收藏、使用记录、统计、登录鉴权、站内消息接口。

### MVP 范围
- 核心能力已完成：工具管理、桌面首页、搜索、收藏、打开工具、使用统计、本地缓存、登录权限、消息通知、留言板插件、内嵌 WebView、软件下载页、桌面端在线更新。
- 支持工具类型：`external_link` 外部链接、`internal_web` 内置 Web 工具、`local_plugin` 本地插件；首批内置工具已完成 6 个。
- 当前主线：`P13 上线交付收敛` 和 `P15-P18 插件/移动端能力收敛`。
- 暂缓：远程插件市场、Node 插件、本机命令、任意文件系统访问、原生移动端、小程序。

### 进度跟踪
| 阶段 | 状态 | 目标 |
| --- | --- | --- |
| 基础 MVP | 已完成 | 后端模块、后台管理、桌面首页、数据接入、内置工具、验证收敛 |
| 账号消息与桌面体验 | 已完成 | 登录权限、消息通知、留言板、WebView、下载页、在线更新 |
| P13 上线交付 | 进行中 | 生产部署、Windows/CI 打包、更新链路验证 |
| P15-P18 插件与移动端 | 进行中 | 插件市场、Web 沙箱、插件更新、H5/PWA |

## 2. 项目结构与技术栈

```text
brmtool/
├── cool-service-master/
│   ├── api/   # Midway.js + COOL Admin + TypeORM 后端
│   └── vue/   # Vue 3 + Element Plus + COOL Admin 管理端
├── cool-electron/  # Electron + electron-vite + Vue 3 + Naive UI 桌面端
├── cool-uni-8.x/   # UniApp，H5/PWA 移动端入口
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
# 管理端静态资源部署到 https://tool.baotounews.cn/
# 后端接口由 Nginx 反代到 https://tool.baotounews.cn/api
# 桌面端更新包上传到 https://tool.baotounews.cn/updates/desktop
# 软件下载页公开访问 https://tool.baotounews.cn/download
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
- `ToolboxPluginEntity`：工具箱插件市场数据，保存插件清单、版本、权限、包地址、checksum、审核/发布/安装状态。
- `MessageInfoEntity`：保存标题、内容、等级、目标范围、跳转动作、发布时间、状态。
- `MessageReadEntity`：保存 `messageId + userId` 已读状态。

### 接口
- 管理端：分类 CRUD、工具 CRUD、启停/推荐/热门/最新/排序、使用统计。
- 登录：复用 APP 用户体系，桌面端用 `/app/user/login/password` 和 `/app/user/info/person`。
- 留言板：桌面端提交我的建议，后台查看、更新、删除留言数据。
- 插件市场：
  - `GET /app/toolbox/plugins/market`
  - `POST /app/toolbox/plugins/checkUpdates`
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
- `local_plugin` 第三方插件第一版只允许 Web 沙箱运行，不执行 Node、本机命令、子进程或任意文件系统访问。
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
- 插件市场：管理员维护插件包、版本、权限、审核状态、发布状态；发布后自动关联为 `local_plugin` 工具。

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
- 启动后检查已关联插件版本；插件更新不影响主程序在线更新链路。

### 打开方式
- `external_browser`：主进程 `shell.openExternal`。
- `electron_window`：主进程创建独立工具窗口。
- `embedded_webview`：桌面端内嵌 WebView 打开，提供返回、刷新、返回首页、关闭和地址栏。
- `internal_route`：Renderer 内部路由。
- `local_plugin + plugin:<code>`：Electron WebView 沙箱运行；`nodeIntegration=no`、`contextIsolation=yes`、`sandbox=yes`，只暴露 `window.brmtoolPlugin` 受限 API。

## 9. 分阶段实施清单

### 历史完成摘要
- 基础 MVP 已完成：本机 MySQL、`toolbox` 后端模块、分类/工具/统计后台、Electron 首页、工具列表、缓存、收藏、使用记录、6 个内置工具和基础验证。
- 账号消息与桌面体验已完成：APP 用户登录、工具级权限、token 注入、消息通知、留言板插件、内嵌 WebView、侧栏折叠、软件下载页和桌面端在线更新。
- 上线基础已完成：生产 env 示例、Nginx/1Panel/宝塔部署文档、域名 `tool.baotounews.cn` 配置脚本、发布检查脚本和桌面端 CI 打包工作流。

### P13 上线交付收敛
- 目标：把已完成 MVP 从本地开发态收敛为可内测上线的发布链路。
- 部署方式：计划使用 1Panel 或宝塔，域名为 `tool.baotounews.cn`，首版发布 unsigned 内测包。
- [x] 确认真实上线域名：`tool.baotounews.cn`。
- [ ] 确认服务器部署目录、HTTPS 证书、Node/MySQL 版本。
- [x] 新增 `scripts/configure-deploy.mjs`，用 `DEPLOY_DOMAIN` 批量替换后端、管理端、Electron、Nginx、发布文档中的生产占位域名。
- [x] 新增 `scripts/check-release-config.mjs`，检查占位域名、敏感 env、更新包元数据和安装包目录。
- [x] 新增 GitHub Actions `Desktop Build` 工作流，可在 macOS/Windows runner 产出桌面端安装包和更新元数据。
- [x] 使用真实域名运行配置脚本，替换生产占位域名：后端、管理端、Electron API base、electron-builder publish URL、下载页地址。
- [x] 新增 `docs/deploy/1panel-baota.md`，补充 1Panel/宝塔站点、反代、静态资源和更新包部署说明。
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

### P15 插件标准与市场后台
- 目标：第一版插件市场采用后台自建，插件包由管理员上传到受控静态目录后，在后台录入、审核、发布。
- [x] 新增 `plugin.json` 规范文档：`code`、`name`、`version`、`entry`、`icon`、`permissions`、`minAppVersion`、`checksum`、`packageUrl`。
- [x] 后端新增 `ToolboxPluginEntity`，保存插件包、版本、权限、审核状态、发布状态、安装状态和更新说明。
- [x] 管理端新增插件市场页面：插件 CRUD、权限配置、审核/发布/下线、关联工具。
- [x] 插件发布后自动创建或更新 `toolbox_tool`，类型为 `local_plugin`，入口为 `plugin:<code>`。
- [x] 插件 zip 上传、解包、checksum 服务端校验已接入；后台上传后生成 `/plugins/<code>/<version>/` 静态入口和 `/plugins/<code>/<version>.zip` 包地址。
- [ ] 插件版本记录、审核流转和安装失败原因展示继续细化。

### P16 第三方插件 Web 沙箱
- 目标：第三方插件第一版只允许 Web 沙箱运行，默认无本机能力。
- [x] Electron 新增插件运行容器，只加载可信 HTTPS 或 `/plugins/` 相对入口。
- [x] WebView 强制 `sandbox=yes`、`nodeIntegration=no`、`contextIsolation=yes`。
- [x] 单独插件 preload 只暴露 `window.brmtoolPlugin`，避免复用主程序 `window.api`。
- [x] 插件请求 IPC 只允许 `/app/toolbox/**` 白名单路径。
- [x] 插件私有存储使用插件作用域 localStorage。
- [x] 插件运行前按 `permissions` 展示权限确认，用户确认后再加载 Web 沙箱。
- [ ] 插件能力开关继续保持白名单收敛；后续如新增权限必须同时补后端校验、preload 和 UI 提示。

### P17 插件自动更新
- 目标：插件包更新独立于主程序更新，失败时不影响主程序和旧版插件。
- [x] 后端提供 `/app/toolbox/plugins/checkUpdates`，返回可更新插件、版本、包地址、checksum、更新说明。
- [x] 桌面端启动后根据已安装 `plugin:<code>` 工具检查插件版本，发现更新后提示同步状态。
- [x] 桌面端后台下载插件包、校验 checksum，并原子写入本地插件包缓存；运行入口仍以后台发布的 `/plugins/` 静态入口为准。
- [ ] 插件包本地解包运行、运行失败自动回滚到最后可用版本。
- [ ] 管理端展示本机安装版本、最新版本、更新状态和失败原因。

### P18 移动端 H5/PWA
- 目标：先用 `cool-uni-8.x` 做 H5/PWA，覆盖浏览、搜索、收藏、打开 Web 工具和消息入口。
- [x] 新增 H5 工具箱首页：分类、搜索、推荐工具、移动端工具卡。
- [x] 复用 `/app/toolbox/home` 聚合接口，工具列表按后台 `sort` 倒序展示。
- [x] 新增 H5 WebView 打开页；`external_link` 和适合 Web 的 `internal_web` 可在移动端打开。
- [x] `local_plugin` 在移动端标记为“仅桌面”，不误开桌面专属插件。
- [x] UniApp 生产代理域名更新为 `https://tool.baotounews.cn`。
- [x] H5 登录态拦截、收藏同步、消息列表/未读数、基础 manifest 和离线提示已完成。
- [ ] H5/PWA service worker 离线缓存策略、移动端空状态和弱网体验继续完善。

### P13 验证计划
- 配置检查：搜索确认生产代码不再残留 `show.cool-admin.com`、`https://example.com/auto-updates`、生产数据库示例密码和真实密钥。
- 后端：`pnpm lint`、`pnpm build`；使用生产环境变量启动一次，验证 `/api/app/toolbox/home`、`/api/admin/base/open/eps` 经 Nginx 可达。
- 管理端：`pnpm type-check`、`pnpm build`；部署静态产物后验证登录、工具管理、消息管理、使用统计接口都走 `/api`。
- 桌面端：`pnpm typecheck`、`pnpm build`、`pnpm build:mac --publish never`；Windows 打包在 CI 或 Windows 机器补跑。
- 更新链路：本地模拟 update server，验证检查更新、下载进度、下载完成提示、稍后安装、立即安装 IPC 流程。
- 发布验证：安装旧版本客户端，确认能发现新版本、自动下载、提示重启安装并升级成功；验证失败时可回滚到上一版元数据。

### 最近验证记录
- 后端：`pnpm build`、删除构建生成的临时 `src/index.ts` 后 `pnpm lint` 通过。
- 管理端：`pnpm type-check`、`pnpm build` 通过；构建时本地 API 未启动，EPS 拉取提示失败但使用现有缓存继续完成构建。
- 桌面端：`pnpm typecheck`、`pnpm build` 通过；`out/preload/plugin.js` 和主 preload 均已生成。
- 移动端：`pnpm exec tsc --noEmit` 通过；`pnpm exec vite build` 仍需补齐 UniApp/HBuilderX 构建环境。
- 发布检查：`node scripts/check-release-config.mjs` 通过；提示 `UPDATE_DIR` 未设置，因此本地未检查更新包元数据。
- 通用：`git diff --check` 通过。

## 10. 验收标准

- 后端、后台、桌面端核心工具链可用：分类、工具、收藏、使用记录、统计、内置工具和外链打开流程稳定。
- 登录、权限、消息、留言板和统计数据可在桌面端与后端之间同步。
- 上线后管理端、后端、下载页和桌面端更新链路统一指向 `https://tool.baotounews.cn` 同域名分路径，可支撑 unsigned 内测发布。
- 后台可维护自建插件市场；已发布插件可关联为 `local_plugin` 工具，第三方插件只能在 Web 沙箱内运行。
- H5/PWA 移动端可复用工具箱接口展示、搜索并打开适合 Web 的工具，桌面专属插件不误开。
- 代码遵循现有 CoolAdmin / Electron 风格，不提交密钥、构建产物或本地缓存，不破坏白名单 IPC 和生产安全约束。
