# cool-electron

> 一个基于 Electron + Vue3 + TypeScript + Naive UI 的通用基座项目，面向开源分享，展示桌面应用开发的最佳实践。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| [electron-vite](https://electron-vite.org) | v2.x | Electron 构建工具 |
| [Vue](https://vuejs.org) | v3.x | 渲染进程 UI 框架 |
| TypeScript | v5.x | 类型系统 |
| [Naive UI](https://www.naiveui.com) | v2.43.2 | UI 组件库 |

---

## 项目定位

本项目作为 Electron 桌面应用的**通用基座**，主要演示以下两种 IPC（进程间通信）模式：

### 模式一：Renderer → Main（请求响应）

- API：`ipcRenderer.invoke` + `ipcMain.handle`
- 场景：渲染进程发起调用，等待主进程返回结果
- 示例：Renderer 请求获取系统信息（OS、CPU、内存等），Main 返回数据

### 模式二：Main → Renderer（主动推送）

- API：`ipcMain.on` + `webContents.send`
- 场景：主进程主动向渲染进程推送消息
- 示例：Main 模拟后台任务，定时向 Renderer 推送进度消息

---

## 代码模块化规范

**Main 进程的每个功能必须独立成模块**，代码放在 `src/main/<模块名>/` 目录下。

```
src/
├── main/
│   ├── index.ts          # 主进程入口，只负责初始化和注册各模块
│   ├── ipc/              # IPC 通信模块
│   │   └── index.ts
│   └── <其他模块>/
│       └── index.ts
├── preload/
│   └── index.ts          # 预加载脚本，暴露安全 API 给 Renderer
└── renderer/
    └── src/
        ├── App.vue
        └── <页面/组件>/
```

> **规则**：新增 Main 功能时，在 `src/main/<功能名>/` 下创建对应模块，在 `src/main/index.ts` 中统一注册，禁止将业务逻辑直接写在 `index.ts` 中。

---

## 文档规范

`docs/` 目录用于存放所有 **Main 进程功能模块的说明文档**，每个模块对应一个独立的 Markdown 文件，方便查阅和维护。

**每个 Main 功能模块都必须有对应的文档**，以 `docs/<模块名>.md` 命名。

```
docs/
├── ipc.md           # IPC 通信模块文档
├── file.md          # 文件系统模块文档
├── notification.md  # 系统通知模块文档
├── request.md       # HTTP 请求模块文档
└── <其他模块>.md
```

文档内容应包含：
1. 模块功能说明
2. API 接口列表（channel 名称、入参、返回值）
3. 使用示例

> **规则**：新增功能模块时，必须同步在 `docs/` 目录下创建 `<模块名>.md` 文档。

---

## 目录结构总览

```
cool-electron/
├── docs/                      # 各模块功能文档（每模块一个 .md 文件）
│   ├── ipc.md                 # IPC 通信模块文档
│   ├── file.md                # 文件系统模块文档
│   ├── notification.md        # 系统通知模块文档
│   └── request.md             # HTTP 请求模块文档
├── src/
│   ├── main/                  # 主进程（按模块拆分）
│   │   ├── index.ts           # 入口：只做模块注册
│   │   ├── ipc/               # IPC 通信模块
│   │   │   └── index.ts
│   │   ├── file/              # 文件系统模块
│   │   │   └── index.ts
│   │   ├── notification/      # 系统通知模块
│   │   │   └── index.ts
│   │   └── request/           # HTTP 请求模块
│   │       └── index.ts
│   ├── preload/               # 预加载脚本
│   │   ├── index.ts
│   │   └── index.d.ts
│   └── renderer/              # 渲染进程（Vue3 应用）
│       └── src/
│           ├── App.vue
│           └── main.ts
├── .env                       # 基础配置
├── package.json
└── README.md
```

---

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
# macOS
pnpm build:mac

# Windows
pnpm build:win

# Linux
pnpm build:linux
```

---

## 常见问题

### Error: Electron uninstall（启动时报错）

**现象：** 执行 `pnpm dev` 后，Vite 构建成功，但随即报错：

```
Error: Electron uninstall
    at getElectronPath ...
```

**原因：** `pnpm install` 后 electron 的 postinstall 脚本未能成功下载二进制文件，导致 `node_modules/electron/dist/` 目录不存在。常见于以下情况：

**解决方法：**

第一步，手动触发 electron 二进制下载：

```bash
node node_modules/electron/install.js
```

如遇网络超时，可指定国内镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js
```

第二步，验证安装是否成功：

```bash
pnpm exec electron --version
```

能正常输出版本号（如 `v28.x.x`）即表示安装成功，之后正常执行 `pnpm dev` 即可。

---

## 相关文档

- [electron-vite 文档](https://electron-vite.org)
- [Naive UI 文档](https://www.naiveui.com)
- [IPC 通信模块文档](./docs/ipc.md)
- [文件系统模块文档](./docs/file.md)
- [系统通知模块文档](./docs/notification.md)
- [HTTP 请求模块文档](./docs/request.md)
