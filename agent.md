# AGENTS.md – 包融媒工具箱

## 1. Agent Role（角色+优先级）
你是全栈工程师，专注CoolAdmin生态的全栈开发，优先级：1.代码质量 2.系统稳定性 3.开发效率；不做临时hack、不绕开测试。

## 2. Tech Stack（精确到版本）

### 主项目 cool-service-master
| 层级 | 技术 | 版本 |
|------|------|------|
| 后端框架 | Midway.js (Koa) | 3.20.x |
| ORM | TypeORM (@cool-midway/typeorm) | 0.3.20 |
| 后端语言 | TypeScript | ~5.8 |
| 前端框架 | Vue 3 + Element Plus | 3.5 / 2.10 |
| 前端构建 | Vite + pnpm workspace | 5.4.x |
| 状态管理 | Pinia | 2.3 |
| CSS | TailwindCSS | 3.4 |
| 测试 | Jest + ts-jest（后端）/ @vue/test-utils（前端） | 29.x |
| Node.js | >=18 | — |

### 子项目 cool-electron
| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | electron-vite | 2.x |
| UI | Naive UI | 2.43 |
| 语言 | Vue 3 + TypeScript | 3.4 / 5.3 |

### 子项目 cool-uni-8.x
| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | UniApp (Vue3) | 3.0 |
| 状态管理 | Pinia | 2.1 |
| 语言 | TypeScript | ~5.5 |

## 3. Key Commands（可直接执行，分组）

### 主项目 cool-service-master/

#### 后端 (api/)
```bash
cd cool-service-master/api
pnpm install          # 安装依赖
pnpm dev              # 本地启动（端口8001，需先配置数据库）
pnpm build            # 构建
pnpm test             # 全量测试
pnpm cov              # 测试+覆盖率
pnpm lint             # 代码检查 (mwts check)
pnpm lint:fix         # 自动修复 (mwts fix)
```

#### 前端 (vue/)
```bash
cd cool-service-master/vue
pnpm install          # 安装依赖
pnpm dev              # 本地启动（端口9000）
pnpm build            # 构建（输出dist/）
pnpm type-check       # 类型检查 (vue-tsc)
pnpm lint             # lint+自动修复 (eslint)
pnpm format           # 格式化 (prettier)
```

#### 一键启动
```bash
cd cool-service-master
node start-dev.js     # 自动安装依赖并启动前后端
```

### 子项目 cool-electron/
```bash
cd cool-electron
pnpm install          # 安装依赖
pnpm dev              # 本地启动
pnpm build            # 构建
pnpm typecheck        # 类型检查
pnpm lint             # lint+自动修复
```

### 子项目 cool-uni-8.x/
```bash
cd cool-uni-8.x
pnpm install          # 安装依赖
# 通过 HBuilderX 或 vite 运行 uni-app 项目
```

## 4. Project Structure（核心目录，精简）

```
brmtool/
├── agent.md                          # AI Agent 行为规范（本文件）
├── cool-service-master/              # 主项目：CoolAdmin 全栈
│   ├── api/                          #   后端 (Midway.js + TypeORM)
│   │   ├── src/
│   │   │   ├── modules/              #     业务模块（base/demo/dict/user/task/space/...）
│   │   │   ├── comm/                 #     公共工具
│   │   │   ├── config/               #     环境配置（default/local/prod）
│   │   │   └── configuration.ts      #     应用入口配置
│   │   └── test/                     #   测试
│   ├── vue/                          #   前端 (Vue3 + Element Plus)
│   │   ├── src/
│   │   │   ├── modules/              #     业务模块（base/demo/dict/user/task/space/...）
│   │   │   ├── plugins/              #     插件（crud/excel/upload/echarts/...）
│   │   │   ├── cool/                 #     框架核心（bootstrap/router/service/utils）
│   │   │   └── config/               #     环境配置（dev/prod/proxy）
│   │   └── build/                    #   构建相关（eps类型生成等）
│   ├── start-dev.js                  #   一键启动脚本
│   ├── AGENT.md                      #   CoolAdmin 框架详细说明
│   └── PROJECT_STRUCTURE.md          #   项目结构文档
├── cool-electron/                    # Electron 桌面应用
│   └── src/
│       ├── main/                     #   主进程（file/ipc/notification/request 模块）
│       ├── preload/                  #   预加载脚本
│       └── renderer/                 #   渲染进程（Vue3 + Naive UI）
├── cool-uni-8.x/                     # UniApp 移动端
│   ├── pages/                        #   页面
│   ├── cool/                         #   框架核心
│   └── uni_modules/                  #   uni-app 插件模块
└── 素材/                              # 静态资源/截图
```

## 5. Boundaries（三层，最关键）

### ✅ Always（必须做）
- 新功能必写单元测试（后端用Jest，前端用vitest）
- 外部API调用必须try/catch
- 前后端模块一一对应，按模块组织代码
- 后端模块结构：controller/entity/service/event/config.ts
- 前端模块结构：views/components/locales/hooks/config.ts
- 提交前必须过 `pnpm lint` 或 `pnpm test`

### ⚠️ Ask First（先问再动）
- 修改配置文件（vite.config.ts / tsconfig / electron-builder.yml / tailwind.config.js）
- 删现有功能 / 改数据库Schema / 改实体定义
- 加新依赖 / 改依赖版本
- 修改 .env / Dockerfile / docker-compose.yml
- 跨子项目修改（如同时改api和vue）

### ❌ Never（绝对禁止）
- 硬编码密钥、提交.env文件
- 改prod配置、碰Dockerfile和docker-compose.yml
- 直接推main分支、改CI脚本
- 在 `src/main/index.ts`（electron）中直接写业务逻辑，必须独立模块

## 6. Critical Rules（项目特有）

- 组件用函数式，禁止class；支持 `.vue` SFC 和 `.tsx` JSX 两种写法
- 状态管理用 Pinia，不用 Vuex / Redux
- 命名规范：组件 PascalCase、函数/变量 camelCase、常量 UPPER_SNAKE、文件名 kebab-case 或 camelCase
- 后端用 `@CoolController` 装饰器实现快速CRUD，遵循 CoolAdmin 模块规范
- 前端CRUD使用 `@cool-vue/crud` 组件（cl-crud），遵循插件化架构
- Electron 主进程功能按模块分目录（`src/main/<模块名>/index.ts`），每个模块配 docs 文档
- 包管理器统一使用 pnpm

## 7. Product Vision（数智工具箱目标）

基于当前仓库开发一个“数智工具箱”桌面应用：桌面端面向普通用户使用，后台管理端面向管理员配置和运营工具库。

### 用户角色
- 普通用户：在 Electron 桌面端浏览、搜索、收藏、打开工具，查看最近使用和个人信息。
- 管理员：在 CoolAdmin 后台维护工具分类、工具信息、排序、状态、推荐位、入口地址和基础统计。
- 开发者：按模块扩展内置工具、Electron 主进程能力和后端接口，保持可测试、可维护。

### 工具类型
- `external_link`：外部链接工具，打开网页、Web 系统、在线工具。
- `internal_web`：内置 Web 工具，在 Electron Renderer 内部路由运行，如 JSON 格式化、Base64 编解码、URL 编码、Markdown 预览等。
- `local_plugin`：本地插件工具，第一阶段只预留结构，不开放任意命令执行。

### 设计方向
- 桌面端参考深色科技风工具箱界面：左侧导航、顶部搜索、首页 banner、收藏工具、推荐工具卡片、分类入口、通知和我的账号。
- 后台管理端保持 CoolAdmin 现有风格，优先效率、稳定和配置能力，不做大屏化视觉。
- 工具配置由后端统一管理，桌面端拉取并缓存，后端不可用时展示上次缓存或内置默认工具。

## 8. MVP Scope（第一阶段范围）

### 必须完成
- 后端新增 `toolbox` 模块，支持工具分类、工具信息、收藏、使用记录。
- 后台管理端新增工具分类管理、工具管理、基础使用统计页面。
- Electron 桌面端新增工具箱首页、工具列表、工具打开、搜索、收藏和最近使用。
- 支持 `external_link` 和 `internal_web` 两类工具的真实可用流程。
- 支持本地缓存工具配置，离线或接口失败时可降级使用。
- 支持基础使用统计：今日使用次数、工具打开记录、热门工具排行的数据基础。

### 暂缓实现
- 插件商店、插件市场、插件自动更新。
- 第三方插件沙箱和任意本地命令执行。
- 复杂多租户计费、审批流、工作流编排。
- 移动端 `cool-uni-8.x` 的工具箱适配。

## 9. Domain Model（核心数据模型）

### 工具分类 `ToolboxCategoryEntity`
- `name`：分类名称，如“全部”“导航”“工具”“智能”“学习”“签到”。
- `code`：分类编码，如 `all`、`nav`、`tool`、`ai`、`study`。
- `icon`：图标名称或图标 URL。
- `sort`：排序值，数值越小越靠前。
- `status`：状态，`1` 启用，`0` 禁用。
- `remark`：备注。

### 工具信息 `ToolboxToolEntity`
- `categoryId`：所属分类 ID。
- `name`：工具名称。
- `code`：工具编码，保持唯一。
- `description`：工具简介。
- `icon`：图标名称或图标 URL。
- `type`：工具类型，限定为 `external_link`、`internal_web`、`local_plugin`。
- `entry`：工具入口，外链为 URL，内置工具为内部路由，本地插件为插件标识。
- `openMode`：打开方式，支持 `external_browser`、`electron_window`、`embedded_webview`、`internal_route`。
- `tags`：标签 JSON。
- `keywords`：搜索关键词，支持拼音和首字母检索扩展。
- `isRecommend`、`isHot`、`isNew`：推荐、热门、最新标记。
- `sort`、`status`、`version`、`config`、`remark`：排序、状态、版本、扩展配置和备注。

### 用户收藏 `ToolboxFavoriteEntity`
- `userId`：用户 ID。
- `toolId`：工具 ID。
- 同一个用户对同一个工具只能收藏一次。

### 使用记录 `ToolboxUsageEntity`
- `userId`：用户 ID。
- `toolId`：工具 ID。
- `toolName`：工具名称快照。
- `action`：行为类型，第一阶段使用 `open`。
- `clientType`：客户端类型，桌面端使用 `electron`。
- `createdAt`：记录时间。

## 10. API Design（接口设计）

### 管理端接口
- 分类 CRUD：新增、删除、修改、详情、列表、分页。
- 工具 CRUD：新增、删除、修改、详情、列表、分页。
- 工具状态：启用、禁用、推荐、热门、最新、排序。
- 使用统计：今日打开次数、总打开次数、热门工具排行、用户使用排行。

### 桌面端接口
- `GET /app/toolbox/home`：返回首页数据，包括分类、推荐工具、收藏工具、最近使用、统计信息。
- `GET /app/toolbox/tools`：按分类、关键词、标签、状态查询工具列表。
- `GET /app/toolbox/tools/:id`：查询工具详情。
- `POST /app/toolbox/favorite`：收藏或取消收藏工具。
- `POST /app/toolbox/usage`：记录工具打开行为。

### 接口约束
- 管理端接口走 CoolAdmin 现有权限体系。
- 桌面端收藏和使用记录必须绑定当前登录用户。
- 外部链接只允许 `http`、`https` 协议。
- 本地插件第一阶段只返回配置，不执行本地命令。

## 11. Admin Console Plan（后台管理端计划）

在 `cool-service-master/vue/src/modules/toolbox` 新增工具箱管理模块，优先复用 `@cool-vue/crud` 和现有模块组织方式。

### 页面
- 工具分类管理：维护分类名称、编码、图标、排序、状态和备注。
- 工具管理：维护工具名称、分类、类型、入口、打开方式、图标、标签、关键词、推荐位、排序、状态、版本和配置 JSON。
- 使用统计：展示今日打开次数、总打开次数、热门工具排行和用户使用排行。

### 交互要求
- 管理员可快速上下架工具，不需要重新发布桌面端。
- 工具类型和打开方式使用下拉选择，避免手填错误。
- `entry` 根据工具类型给出明确提示：外链填 URL，内置工具填内部路由，本地插件填插件标识。
- 配置 JSON 需要基础格式校验，避免保存非法 JSON。

## 12. Electron Desktop Plan（桌面端计划）

在 `cool-electron` 中开发工具箱桌面端体验，优先保证真实可用，再逐步增强视觉细节。

### 页面结构
- 首页：顶部搜索、欢迎 banner、我的收藏、推荐工具、今日使用统计、最近使用。
- 工具列表页：按分类筛选，支持关键词搜索，支持最新、最热、收藏最多排序。
- 工具运行页：承载内置工具页面和可嵌入工具。
- 我的页面：用户信息、我的收藏、最近使用、同步状态。

### 内置工具 MVP
- JSON 格式化：格式化、压缩、校验 JSON。
- Base64 编解码：文本编码、解码。
- URL 编码/解码：URL encode/decode。
- 文本去重：按行去重，保留顺序。
- Markdown 预览：输入 Markdown 并实时预览。
- 时间戳转换：时间戳与日期时间互转。

### Electron 主进程能力
- 外部链接打开：通过 `shell.openExternal` 实现，只允许安全协议。
- 工具窗口：为部分工具创建独立窗口，逻辑放到独立 main 模块。
- 本地缓存：第一阶段可先使用 Renderer 的 localStorage/IndexedDB；后续如需文件缓存，放到 main 独立模块。
- preload 白名单：只暴露明确 API，禁止 renderer 直接执行 shell 或访问任意文件系统。

## 13. Implementation Roadmap（实施路线）

### Phase 1：后端工具箱模块
- 新增 `cool-service-master/api/src/modules/toolbox`。
- 实现分类、工具、收藏、使用记录实体。
- 实现管理端 CRUD 和桌面端查询接口。
- 初始化默认分类和内置工具数据。

### Phase 2：后台管理端
- 新增 `cool-service-master/vue/src/modules/toolbox`。
- 实现分类管理、工具管理、基础统计页面。
- 接入后端接口并完成基本表单校验。

### Phase 3：Electron 首页与视觉
- 重构 `cool-electron` Renderer 首页为工具箱布局。
- 实现深色科技风 UI：左侧导航、搜索栏、banner、收藏区、推荐工具卡片。
- 建立工具卡片、分类导航、统计卡片等可复用组件。

### Phase 4：桌面端数据接入
- 接入 `/app/toolbox/home` 和工具列表接口。
- 实现接口失败时读取本地缓存。
- 实现收藏、最近使用、使用次数的乐观更新和失败回滚。

### Phase 5：工具打开与内置工具
- 实现外部链接工具打开。
- 实现内置工具内部路由。
- 完成 JSON、Base64、URL 编码、文本去重、Markdown 预览、时间戳转换工具。

### Phase 6：验证与收敛
- 后端运行 `pnpm test` 或关键模块测试。
- 管理端运行 `pnpm type-check` 或 `pnpm build`。
- Electron 运行 `pnpm typecheck` 和必要的启动验证。
- 修复明显类型错误、接口错误和交互断点。

## 14. Acceptance Criteria（验收标准）

### 后端
- `cool-service-master/api` 可正常启动。
- 工具分类、工具信息 CRUD 可用。
- `/app/toolbox/home` 能返回桌面端首页所需数据。
- 收藏和使用记录接口可用，并绑定用户。

### 后台管理端
- 管理员可以新增、编辑、删除、启停工具分类和工具。
- 管理员可以配置外部链接工具和内置工具。
- 推荐、热门、最新、排序、状态能影响桌面端展示。
- 基础统计页面能展示工具使用数据。

### 桌面端
- 首页呈现深色科技工具箱风格。
- 可以展示分类、收藏、推荐工具、最近使用和今日使用次数。
- 可以搜索工具并按分类过滤。
- 可以收藏或取消收藏工具。
- 可以打开外部链接工具和内置工具。
- 后端不可用时可以读取缓存或展示默认工具。

### 代码质量
- 遵循现有目录结构和 CoolAdmin / Electron 代码风格。
- 不引入不必要的新依赖。
- 不把业务逻辑写进 `cool-electron/src/main/index.ts`。
- 不提交密钥、`.env`、构建产物或本地缓存。
- 每个阶段提交前运行该阶段最相关的检查命令。
