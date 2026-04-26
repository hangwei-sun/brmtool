# brmtool

工作工具箱项目集合。当前仓库以 COOL Admin / COOL UNI / Electron 基座为核心，包含后端 API、后台管理端、移动端/小程序端和桌面端示例工程，适合作为业务管理系统、跨端应用和桌面工具的开发起点。

## 项目组成

```text
brmtool/
├── cool-service-master/     # 后台服务与管理端
│   ├── api/                 # Node.js + Midway + TypeScript 后端 API
│   ├── vue/                 # Vue 3 + Element Plus 后台管理端
│   └── start-dev.js         # 一键启动 api + vue 的开发脚本
├── cool-uni-8.x/            # UniApp + Vue 3 移动端/小程序端
├── cool-electron/           # Electron + Vue 3 + TypeScript 桌面端
└── README.md                # 仓库总览
```

## 技术栈

| 子项目 | 主要技术 | 说明 |
| --- | --- | --- |
| `cool-service-master/api` | Node.js、Midway、TypeScript、TypeORM、SQLite/MySQL | 后端 API、权限、用户、字典、任务、插件、文件空间等模块 |
| `cool-service-master/vue` | Vue 3、Vite、Element Plus、Pinia、Vue Router、Tailwind CSS | 后台管理端，包含 CRUD、菜单权限、多语言、开发工具等能力 |
| `cool-uni-8.x` | UniApp、Vue 3、Pinia、Vite、cool-ui | 移动端/小程序端脚手架，内置登录、用户中心、组件示例和请求封装 |
| `cool-electron` | Electron、electron-vite、Vue 3、TypeScript、Naive UI | 桌面端基座，演示 IPC、文件读取、系统通知和主进程 HTTP 请求 |

## 功能概览

### 后台服务与管理端

`cool-service-master` 是 COOL Admin Node 版工程，包含后端 `api` 和管理前端 `vue`。

- 后端默认使用 SQLite，本地数据库文件为 `cool-service-master/api/cool.sqlite`。
- 本地开发配置入口：`cool-service-master/api/src/config/config.local.ts`。
- 管理端本地代理入口：`cool-service-master/vue/src/config/proxy.ts`。
- 默认后端端口：`8001`。
- 默认管理端开发地址：`http://localhost:9000/`。
- 内置模块包括：基础权限、用户、字典、任务、插件、回收站、文件空间、Swagger、Demo 等。

### 移动端 / 小程序端

`cool-uni-8.x` 是 COOL UNI 8.x 脚手架。

- 页面入口：`cool-uni-8.x/pages.json`。
- 应用配置：`cool-uni-8.x/config/index.ts`。
- 开发/生产代理配置：`cool-uni-8.x/config/dev.ts`、`cool-uni-8.x/config/prod.ts`、`cool-uni-8.x/config/proxy.ts`。
- 内置首页、个人中心、登录、验证码、设置、关于页，以及 `cool-ui` 组件演示页面。
- 封装了请求、路由、缓存、上传、全局事件、多语言等基础能力。

### 桌面端

`cool-electron` 是 Electron 桌面应用基座。

- 主进程入口：`cool-electron/src/main/index.ts`。
- 预加载入口：`cool-electron/src/preload/index.ts`。
- 渲染进程入口：`cool-electron/src/renderer/src/main.ts`。
- Main 进程按模块拆分在 `cool-electron/src/main/<module>/` 下。
- 模块文档位于 `cool-electron/docs/`。
- 当前已包含 IPC、文件系统、系统通知、HTTP 请求等模块。

## 环境要求

- Node.js：后端要求 `>= 18.0.0`，UniApp 子项目要求 `>= 16`，建议统一使用 Node.js 18 或 20。
- 包管理器：推荐使用 `pnpm`。部分子项目也保留了 `package-lock.json`，但当前工程更适合使用 `pnpm-lock.yaml` 对齐依赖。
- 桌面端构建需要对应系统的 Electron 构建环境。
- UniApp 如需运行到 App/小程序，可配合 HBuilderX 或对应平台工具链。

## 快速开始

### 1. 克隆仓库

```bash
git clone git@github.com:hangwei-sun/brmtool.git
cd brmtool
```

### 2. 启动后台服务与管理端

推荐使用内置启动脚本：

```bash
cd cool-service-master
node start-dev.js
```

该脚本会：

- 检查并安装 `pnpm`。
- 分别检查 `api` 和 `vue` 依赖。
- 先启动后端 API，再启动管理端。
- 管理端启动成功后自动打开浏览器。

也可以手动启动：

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

启动后访问：

- API：`http://localhost:8001/`
- 管理端：`http://localhost:9000/`

### 3. 启动移动端 / 小程序端

```bash
cd cool-uni-8.x
pnpm install
pnpm dev
```

如需运行到具体平台，请结合 UniApp / HBuilderX 的平台运行能力配置。

### 4. 启动桌面端

```bash
cd cool-electron
pnpm install
pnpm dev
```

构建安装包：

```bash
pnpm build:mac
pnpm build:win
pnpm build:linux
```

如果启动时报 Electron 二进制缺失，可在 `cool-electron` 目录执行：

```bash
node node_modules/electron/install.js
```

网络不稳定时可使用镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js
```

## 常用脚本

### `cool-service-master/api`

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动后端开发服务 |
| `pnpm build` | 构建后端 |
| `pnpm test` | 运行测试 |
| `pnpm lint` | 代码检查 |
| `pnpm start` | 生产模式启动 |

### `cool-service-master/vue`

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动管理端开发服务 |
| `pnpm build` | 构建管理端 |
| `pnpm preview` | 预览构建产物 |
| `pnpm type-check` | 类型检查 |
| `pnpm lint` | 代码检查与修复 |

### `cool-electron`

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动 Electron 开发模式 |
| `pnpm build` | 类型检查并构建 |
| `pnpm build:mac` | 构建 macOS 安装包 |
| `pnpm build:win` | 构建 Windows 安装包 |
| `pnpm build:linux` | 构建 Linux 安装包 |
| `pnpm typecheck` | Node 与 Web 类型检查 |

## 重要配置

| 文件 | 说明 |
| --- | --- |
| `cool-service-master/api/src/config/config.local.ts` | 后端本地数据库、EPS、初始化菜单/数据等配置 |
| `cool-service-master/api/src/config/config.prod.ts` | 后端生产环境配置 |
| `cool-service-master/vue/src/config/proxy.ts` | 管理端开发代理配置 |
| `cool-uni-8.x/config/index.ts` | UniApp 应用名称、登录页、微信配置、请求配置入口 |
| `cool-uni-8.x/config/proxy.ts` | UniApp H5 开发代理配置 |
| `cool-electron/electron-builder.yml` | Electron 打包配置 |

## 开发约定

- 后端业务优先放入 `cool-service-master/api/src/modules/<module>/`。
- 管理端业务模块放入 `cool-service-master/vue/src/modules/<module>/`。
- UniApp 页面放入 `cool-uni-8.x/pages/`，公共能力放入 `cool-uni-8.x/cool/`。
- Electron Main 进程功能按模块放入 `cool-electron/src/main/<module>/`，并在 `cool-electron/src/main/index.ts` 统一注册。
- Electron 新增 Main 模块时，同步在 `cool-electron/docs/<module>.md` 增加说明文档。
- 本地生成的 `node_modules`、构建产物、日志和系统文件不应提交到仓库。

## 参考文档

- [COOL Admin Node 文档](https://node.cool-admin.com/src/introduce/)
- [COOL Admin Vue 文档](https://vue.cool-admin.com/src/guide/quick.html)
- [COOL UNI 文档](https://uni-docs.cool-js.com/)
- [electron-vite 文档](https://electron-vite.org/)
- [Naive UI 文档](https://www.naiveui.com/)
