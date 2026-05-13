# AGENTS.md - 数智工具箱开发手册

> 目标：基于现有 COOL Admin + Electron 基座，逐步实现一个“后台可管理、桌面端可使用”的数智工具箱。

## 1. 当前目标与进度

### 产品目标
- 桌面端：工具浏览、搜索、收藏、内嵌 WebView、本地插件、学习中心、AI 工作台、消息通知、在线更新。
- 后台端：管理工具、插件、学习内容、AI 模型/模板、用户、消息、留言和统计。
- 后端：提供工具配置、收藏、使用记录、统计、登录鉴权、站内消息、插件市场、学习中心和 AI 代理接口。

### MVP 范围
- 核心能力已完成：工具管理、桌面首页、搜索、收藏、打开工具、使用统计、本地缓存、登录权限、消息通知、留言板插件、内嵌 WebView、软件下载页、桌面端在线更新、学习中心、AI 工作台。
- 支持工具类型：`external_link` 外部链接、`internal_web` 内置 Web 工具、`local_plugin` 本地插件；首批内置工具已完成 6 个。
- 当前主线：先收口 `P19 AI 工作台与多模型生成`，并继续推进 `P13 上线交付` 与 `P15-P18 插件/移动端能力`。
- 暂缓：远程插件市场、Node 插件、本机命令、任意文件系统访问、原生移动端、小程序。

### 进度跟踪
| 阶段 | 状态 | 目标 |
| --- | --- | --- |
| 基础 MVP | 已完成 | 后端模块、后台管理、桌面首页、数据接入、内置工具、验证收敛 |
| 账号消息与桌面体验 | 已完成 | 登录权限、消息通知、留言板、WebView、下载页、在线更新 |
| P13 上线交付 | 进行中 | 生产部署、Windows/CI 打包、更新链路验证 |
| P15-P18 插件与移动端 | 进行中 | 插件市场、Web 沙箱、插件更新、H5/PWA |
| P19 AI 工作台与多模型生成 | 进行中 | AI Workspace、DeepSeek 文本对话、火山引擎生图/音频/视频、模型配置、模板管理 |
| P20 PC Web 与移动端一致性 | 进行中 | `/web` 公开工具站、移动端 H5/小程序兼容、工具/学习/消息/AI 同步 |

## 2. 项目结构与技术栈

```text
brmtool/
├── cool-service-master/
│   ├── api/   # Midway.js + COOL Admin + TypeORM 后端
│   └── vue/   # Vue 3 + Element Plus + COOL Admin 管理端
├── cool-electron/  # Electron + electron-vite + Vue 3 + Naive UI 桌面端
├── cool-uni-8.x/   # UniApp，H5/PWA 移动端入口
├── docs/           # 部署、插件、运营文档
├── scripts/        # 发布配置和检查脚本
├── tool.md         # 宝塔部署小白完整方案
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
# PC Web 公开工具站 https://tool.baotounews.cn/web
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
- `ToolboxStudyCategoryEntity`：学习分类，保存分类名称、编码、排序、状态和备注。
- `ToolboxStudyVideoEntity`：学习入库内容，保存标题、分类、封面、视频地址/上传文件、简介、作者、推荐/热门、排序和状态。
- `MessageInfoEntity`：保存标题、内容、等级、目标范围、跳转动作、发布时间、状态。
- `MessageReadEntity`：保存 `messageId + userId` 已读状态。
- `AiModelEntity`：AI 模型配置，保存 provider、capability、modelId、API Key 密文/掩码、Base URL、接口路径、排序和状态。
- `AiTemplateEntity`：AI 模板卡片，保存标题、分类、描述、Prompt、标签、排序和状态。
- `AiConversationEntity` / `AiMessageEntity` / `AiGenerationEntity`：保存 AI 会话、消息、生成记录、错误状态和 usage。

### 接口
- 管理端：分类 CRUD、工具 CRUD、启停/推荐/热门/最新/排序、使用统计。
- 登录：复用 APP 用户体系，桌面端用 `/app/user/login/password` 和 `/app/user/info/person`。
- 留言板：桌面端提交我的建议，后台查看、更新、删除留言数据。
- 插件市场：
  - `GET /app/toolbox/plugins/market`
  - `POST /app/toolbox/plugins/checkUpdates`
- 学习中心：
  - `GET /app/toolbox/study/home`
  - `GET /app/toolbox/study/videos`
  - `GET /app/toolbox/study/videos/:id`
- AI 工作台：
  - `GET /app/ai/models`
  - `GET /app/ai/templates`
  - `GET /app/ai/conversations`
  - `GET /app/ai/conversations/:id`
  - `POST /app/ai/conversations`
  - `POST /app/ai/chat`
  - `POST /app/ai/generate`
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
- AI 模型 API Key 可后台录入和修改，但接口不回显明文；环境变量仅作为服务器兜底配置。
- 上传文件、插件静态资源和学习封面/视频必须经 `/upload` 或 `/plugins` 明确反代访问，不能依赖管理端静态目录。

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
- 学习分类/学习入库：后台维护学习中心分类和视频内容；分类可联动选择，封面/视频支持输入 URL 或本地上传。
- AI 模型管理：维护 DeepSeek 和火山引擎模型，支持 API Key、Base URL、接口路径、能力类型、默认模型、排序和状态。
- AI 模板管理：维护桌面端智能页模板卡片，桌面端按后台排序展示。

## 8. Electron 桌面端设计摘要

### 页面
- 首页：顶部搜索、欢迎 banner、我的收藏、推荐工具、今日使用、最近使用。
- 工具列表：分类筛选、关键词搜索、最新/最热/收藏最多排序。
- 学习中心：学习分类、标签筛选、推荐/热门内容、学习详情页。
- AI 工作台：独立流式对话主界面、历史会话侧栏、模型切换、Thinking 开关、模板卡片、图片/音频/视频生成入口。
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
- 智能页请求统一走 Main/Preload 白名单 `/app/ai/**`，不在 Renderer 暴露第三方模型地址和密钥。

### 打开方式
- `external_browser`：主进程 `shell.openExternal`。
- `electron_window`：主进程创建独立工具窗口。
- `embedded_webview`：桌面端内嵌 WebView 打开，提供返回、刷新、返回首页、关闭和地址栏。
- `internal_route`：Renderer 内部路由。
- `local_plugin + plugin:<code>`：Electron WebView 沙箱运行；`nodeIntegration=no`、`contextIsolation=yes`、`sandbox=yes`，只暴露 `window.brmtoolPlugin` 受限 API。
- `AI generation`：文本、图片、音频、视频生成都经后端代理；桌面端只展示任务状态、结果 URL 和错误提示。

## 9. 分阶段实施清单

### 历史完成摘要
- 基础 MVP 已完成：本机 MySQL、`toolbox` 后端模块、分类/工具/统计后台、Electron 首页、工具列表、缓存、收藏、使用记录、6 个内置工具和基础验证。
- 账号消息与桌面体验已完成：APP 用户登录、工具级权限、token 注入、消息通知、留言板插件、内嵌 WebView、侧栏折叠、软件下载页和桌面端在线更新。
- 学习与 AI 已完成主链路：学习分类/学习入库后台、桌面端学习中心、AI 模型/模板后台、桌面端 AI 工作台、DeepSeek 文本流式对话、火山引擎生成代理。
- 上线基础已完成：生产 env 示例、Nginx/1Panel/宝塔部署文档、`tool.md` 小白部署方案、域名 `tool.baotounews.cn` 配置脚本、发布检查脚本和桌面端 CI 打包工作流。

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

### P19 AI 工作台与多模型生成
- 目标：将桌面端“智能”分类改造成独立 AI 工作台，首版文本对话接入 DeepSeek，图片/音频/视频生成接入火山引擎能力。
- [x] 后端新增 `ai` 模块：模型配置、模板、会话、消息实体与 APP 接口。
- [x] DeepSeek API Key 支持后台模型管理添加/修改，接口不回显明文；`BRMTOOL_DEEPSEEK_API_KEY` 仅作为服务器环境变量兜底。
- [x] 支持 `deepseek-v4-pro` / `deepseek-v4-flash` 模型配置和桌面端切换。
- [x] Electron 新增 AI Workspace：Prompt 创作框、能力卡片、模板发现、历史会话和流式输出。
- [x] 管理端新增 AI 模型管理和模板管理。
- [x] 生图、音乐/语音、视频生成接口代理已接入火山引擎能力；Seedream / Seedance / 音频模型的 key、Base URL、生成路径可在后台模型管理配置。
- [ ] 回归验证火山引擎模型 ID、默认尺寸、请求超时和任务查询状态；后台模型配置必须以实际开通 endpoint 为准。
- [ ] 文件上传参考、`/` 技能、`@` 主体先保留 UI 语义，暂不做文件解析和知识库检索。

### P20 PC Web 与移动端一致性
- 目标：补齐用户侧 PC Web 与移动端体验，使其与 Electron 桌面端保持同一套工具箱信息架构。
- [x] 管理端新增公开 page 路由 `/web`，不进入后台主布局，提供 PC Web 工具站。
- [x] PC Web 已覆盖首页、工具/导航筛选、收藏、登录、消息、学习中心、AI 工作台和内嵌网页运行区。
- [x] 移动端 `pages/toolbox/home` 已升级为多工作区入口，覆盖工具、学习、AI、消息和我的。
- [x] 移动端外链打开做 H5/小程序差异处理：H5 进入 web-view，小程序复制链接并提示。
- [x] PC Web 文本 AI 使用流式接口，移动端使用兼容 H5/小程序的普通请求；图片、音频、视频生成均走 `/app/ai/generate`。
- [x] 移动端工具箱完成一轮视觉收口：统一移动控制台风格、触控尺寸、卡片密度、搜索/Tab/AI 输入区层级，并避免使用小程序兼容性较弱的样式。
- [x] 移动端补齐工具、学习、消息、收藏和 AI 元数据加载的空状态、错误提示与重试/登录动作，弱网时不只依赖 toast。
- [x] 移动端工具箱启用页面下拉刷新，并为工具、学习、消息和 AI 配置加载补齐轻量骨架屏。
- [x] 移动端“我的”页新增联调自检面板，可一键检查工具、Web 打开、学习、AI 和消息的当前就绪状态。
- [x] 移动端联调自检项支持点击直达验证目标：工具/学习/AI Tab 或消息面板；未登录项自动唤起登录。
- [x] 移动端联调自检补充环境摘要：展示接口地址、登录态、核心数据数量和最近检查时间。
- [x] 移动端联调自检支持复制诊断报告，便于 H5/小程序现场问题回传。
- [x] 新增 `docs/qa/mobile-p20-checklist.md`，固化 H5 浏览器、小程序开发者工具和生产域名联调清单。
- [ ] 需要在真实浏览器、小程序开发者工具和生产域名下做视觉与接口联调。

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
- P20 移动端样式收口：`git diff --check`、`cool-uni-8.x pnpm exec tsc --noEmit` 通过；`pnpm exec vite build --mode h5` 仍失败于缺少既有构建器依赖 `@dcloudio/vite-plugin-uni`，需在完整 UniApp/HBuilderX 环境复跑。
- P20 移动端空状态/弱网体验：`git diff --check`、`cool-uni-8.x pnpm exec tsc --noEmit` 通过；工具、学习、消息、收藏和 AI 元数据加载失败已提供页面内重试或登录动作。
- P20 移动端加载/刷新体验：根据 UniApp 文档为工具箱页开启 `enablePullDownRefresh`，接入 `onPullDownRefresh` 和 `uni.stopPullDownRefresh()`；`git diff --check`、`cool-uni-8.x pnpm exec tsc --noEmit` 通过。
- P20 移动端联调自检入口：`cool-uni-8.x pnpm exec tsc --noEmit` 通过；“我的”页可刷新并展示工具、移动端打开、学习、AI、消息五项状态。
- P20 移动端联调自检直达：`git diff --check`、`cool-uni-8.x pnpm exec tsc --noEmit` 通过；自检项可点击进入对应验证目标。
- P20 移动端联调自检摘要：`git diff --check`、`cool-uni-8.x pnpm exec tsc --noEmit` 通过；自检面板可显示接口、身份、数据量和最近检查时间。
- P20 移动端联调报告复制：已用 `ctx7` 查询 UniApp 剪贴板 API，`git diff --check`、`cool-uni-8.x pnpm exec tsc --noEmit` 通过；复制内容不包含 token、key 或密码。
- P20 移动端联调清单：已用 `ctx7` 查询 UniApp 多平台构建文档，新增 `docs/qa/mobile-p20-checklist.md`，记录 H5、小程序和生产域名验证项；仅为待执行清单，不虚假勾选真实联调。
- 发布检查：`node scripts/check-release-config.mjs` 通过；提示 `UPDATE_DIR` 未设置，因此本地未检查更新包元数据。
- 文档：`README.md` 已更新为当前产品总览，`tool.md` 已补充宝塔部署全流程，`/web` 公开工具站与移动端一致性已记录。
- 通用：`git diff --check` 通过。

### 当前交接状态
- 当前仓库主线已同步到 `origin/main`；后续提交前仍需检查是否混入构建产物、真实 `.env` 或密钥。
- 下一步 P13：在宝塔创建站点和反代，配置生产 `.env.production`，部署管理端静态资源，验证 `/api/app/toolbox/home`、`/api/admin/base/open/eps`、`/web`、`/download`、`/upload`、`/plugins`。
- 桌面端发布：使用 GitHub Actions 或 Windows 机器补跑 Windows unsigned 包，macOS 本机产出内测包后上传 `latest*.yml`、安装包和 blockmap 到 `/updates/desktop`。
- 近期问题优先级：先回归学习入库后台列表和桌面端学习卡片显示，再回归 AI 生成模型的后台配置、超时和错误提示。
- 插件与 H5 后续：插件本地解包运行、失败回滚、安装失败原因展示、PWA service worker 离线缓存仍是未完成项。
- 注意：`cool-service-master/vue/build/cool/eps.d.ts` 是生成文件，管理端构建或 EPS 拉取会改动；提交前确认差异是否来自本轮后端接口变化。

## 10. 验收标准

- 后端、后台、桌面端核心工具链可用：分类、工具、收藏、使用记录、统计、内置工具和外链打开流程稳定。
- 登录、权限、消息、留言板和统计数据可在桌面端与后端之间同步。
- 上线后管理端、后端、下载页和桌面端更新链路统一指向 `https://tool.baotounews.cn` 同域名分路径，可支撑 unsigned 内测发布。
- 后台可维护自建插件市场；已发布插件可关联为 `local_plugin` 工具，第三方插件只能在 Web 沙箱内运行。
- H5/PWA 移动端可复用工具箱接口展示、搜索并打开适合 Web 的工具，桌面专属插件不误开。
- 学习中心后台入库后，桌面端能展示标题、封面、分类、推荐/热门状态和详情内容。
- AI 工作台可通过后台模型配置接入文本、图片、音频、视频能力；API Key 不泄露，错误提示可读。
- 代码遵循现有 CoolAdmin / Electron 风格，不提交密钥、构建产物或本地缓存，不破坏白名单 IPC 和生产安全约束。
