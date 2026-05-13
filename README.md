# 数智工具箱 brmtool

数智工具箱是一个“后台可管理、桌面端可使用、移动端可浏览”的综合工具平台。项目基于 COOL Admin、Electron、UniApp 组合开发，当前已覆盖工具管理、桌面工具箱、用户登录、消息通知、插件市场、学习中心、AI 工作台、软件下载页和桌面端在线更新。

生产域名规划为：`https://tool.baotounews.cn`

## 项目能力

- 后台管理：工具分类、工具管理、使用统计、消息通知、留言板、学习分类、学习入库、插件市场、AI 模型与模板管理。
- 桌面端：科技风工具箱首页、分类/标签筛选、搜索、收藏、内嵌 WebView、内置工具、本地插件、消息通知、个人中心、在线更新。
- PC Web：公开用户侧工具站 `/web`，提供工具浏览、学习中心、消息、登录、收藏和 AI 工作台。
- AI 工作台：DeepSeek 文本对话、流式输出、会话历史、模板创作、火山引擎图片/音频/视频生成接口代理。
- 插件体系：后台自建插件市场、插件包上传/解包/checksum 校验、Web 沙箱运行、插件更新检查。
- 学习中心：后台维护学习分类和视频内容，桌面端按分类、推荐、热门展示学习内容。
- 移动端 H5/PWA：浏览、搜索、收藏、消息、打开 Web 工具，桌面专属插件在移动端标记为仅桌面可用。
- 上线交付：同域名分路径部署、公开下载页、macOS/Windows 安装包、`electron-updater` 在线更新链路。

## 项目结构

```text
brmtool/
├── cool-service-master/
│   ├── api/                 # Midway.js + COOL Admin + TypeORM 后端
│   ├── vue/                 # Vue 3 + Element Plus 管理端和 /download 下载页
│   └── start-dev.js         # 本地一键启动 api + vue
├── cool-electron/           # Electron + Vue 3 桌面端
├── cool-uni-8.x/            # UniApp H5/PWA 移动端
├── docs/                    # 部署、插件、运营等项目文档
├── scripts/                 # 发布配置和检查脚本
├── agent.md                 # AI/工程师协作开发手册
├── tool.md                  # 宝塔部署小白完整方案
└── README.md                # 项目总览
```

## 技术栈

| 子项目 | 技术 | 说明 |
| --- | --- | --- |
| `cool-service-master/api` | Node.js、Midway.js、TypeScript、TypeORM、MySQL、COOL Admin | 后端 API、APP 接口、后台 CRUD、AI/插件/学习/消息模块 |
| `cool-service-master/vue` | Vue 3、Vite、Element Plus、Pinia、COOL CRUD | 后台管理端和公开下载页 |
| `cool-electron` | Electron、electron-vite、Vue 3、TypeScript、Naive UI、electron-updater | 桌面端工具箱、WebView、插件沙箱、在线更新 |
| `cool-uni-8.x` | UniApp、Vue 3、Pinia、Vite、cool-ui | H5/PWA 移动端入口 |

## 核心模块

### 工具箱

- 工具类型：`external_link`、`internal_web`、`local_plugin`。
- 打开方式：外部浏览器、Electron 新窗口、内嵌 WebView、内部路由、本地插件。
- 排序规则：后台和桌面端均按 `sort` 数字倒序展示，数字越大越靠前。
- 权限规则：工具可配置公开访问或登录后访问；未登录用户只能使用公开工具。

### 桌面端

- 首页、导航、工具、智能、学习等主要页面已接入后台数据。
- 内嵌 WebView 支持返回、刷新、返回首页、关闭和地址栏。
- 左侧菜单支持折叠，桌面端默认窗口为 `1280x720`。
- 在线更新使用 `electron-updater + electron-builder generic provider`，更新包目录为 `/updates/desktop`。

### AI 工作台

- 后端 `ai` 模块保存模型配置、模板、会话、消息和生成记录。
- API Key 可在后台 AI 模型管理中配置；接口不回显明文。
- DeepSeek 文本模型支持流式对话和会话历史。
- 火山引擎图片、音频、视频生成通过后端代理访问，模型 ID、Base URL、接口路径可后台维护。

### 插件市场

- 管理员上传插件 zip 后，后端解包并校验 checksum。
- 插件发布后可自动关联为 `local_plugin` 工具。
- Electron 插件运行使用 Web 沙箱：禁用 Node、本机命令、任意文件系统和非白名单 IPC。

### 学习中心

- 后台维护学习分类和学习内容。
- 学习内容支持封面、视频地址、上传文件、推荐、热门、排序和状态。
- 桌面端学习页按后台分类与内容实时展示。

## 环境要求

- Node.js：建议 `22.x`，最低 `18.x`。
- 包管理器：`pnpm`。
- 数据库：MySQL 5.7/8.0，推荐 8.0。
- 桌面端打包：macOS 安装包建议在 macOS 构建，Windows 安装包建议在 Windows 或 GitHub Actions 构建。

本地开发数据库：

```sql
CREATE DATABASE brmtool DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 快速开始

### 1. 克隆仓库

```bash
git clone git@github.com:hangwei-sun/brmtool.git
cd brmtool
```

### 2. 启动后端和管理端

推荐使用一键脚本：

```bash
cd cool-service-master
node start-dev.js
```

也可以分别启动：

```bash
cd cool-service-master/api
pnpm install
pnpm dev
```

```bash
cd cool-service-master/vue
pnpm install
pnpm dev
```

默认地址：

- 后端：`http://127.0.0.1:8001`
- 管理端：`http://localhost:9000`

### 3. 启动桌面端

```bash
cd cool-electron
pnpm install
pnpm dev
```

### 4. 启动移动端 H5

```bash
cd cool-uni-8.x
pnpm install
pnpm dev
```

## 常用命令

### 后端

```bash
cd cool-service-master/api
pnpm dev
pnpm build
pnpm lint
pnpm start
```

### 管理端

```bash
cd cool-service-master/vue
pnpm dev
pnpm type-check
pnpm build
```

### 桌面端

```bash
cd cool-electron
pnpm dev
pnpm typecheck
pnpm build
pnpm build:mac --publish never
pnpm build:win --publish never
```

### 移动端

```bash
cd cool-uni-8.x
pnpm dev
pnpm exec tsc --noEmit
```

## 上线部署

当前推荐宝塔/1Panel 单域名分路径部署：

```text
https://tool.baotounews.cn/                  # 管理端静态资源
https://tool.baotounews.cn/web               # PC Web 公开工具站
https://tool.baotounews.cn/download          # 桌面端软件下载页
https://tool.baotounews.cn/api               # 后端接口反代
https://tool.baotounews.cn/upload            # 上传文件访问
https://tool.baotounews.cn/plugins           # 插件静态文件访问
https://tool.baotounews.cn/updates/desktop   # 桌面端更新包
```

详细小白部署步骤见 [tool.md](/tool.md)。

生产配置要点：

- 后端生产环境读取 `cool-service-master/api/.env.production`，真实密钥和数据库密码只放服务器，不提交 Git。
- 管理端生产接口统一走 `/api`。
- Electron API base 指向 `https://tool.baotounews.cn/api`。
- Electron 更新包需要同时上传安装包、`latest.yml`、`latest-mac.yml` 和 blockmap。

## 重要文档

- [AI/工程师开发手册](agent.md)
- [宝塔部署完整方案](tool.md)
- [1Panel/宝塔部署说明](docs/deploy/1panel-baota.md)
- [P14 运营增强路线图](docs/operations/p14-roadmap.md)

## 安全约束

- 不提交真实 `.env`、数据库密码、API Key、签名证书、发布 token。
- AI 模型密钥优先通过后台模型管理维护，接口不回显明文。
- Electron Renderer 不直接访问任意后端地址，统一走 Main/Preload 白名单 API。
- 第三方插件只允许 Web 沙箱运行，不开放 Node、本机命令、子进程或任意文件系统。
- 生产环境保持数据库自动同步关闭，正式上线前通过备份和脚本管理 schema。

## 当前阶段

- MVP 核心能力已完成。
- 当前主线：P13 内测上线交付、P15-P18 插件/移动端能力收敛、P19 AI 工作台与多模型生成体验收口、P20 PC Web 与移动端一致性收口。
- 下一步重点：宝塔生产部署验证、Windows unsigned 安装包、在线更新实测、学习入库显示问题回归验证、AI 生成模型后台配置完善。
