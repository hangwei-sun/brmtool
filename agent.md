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
