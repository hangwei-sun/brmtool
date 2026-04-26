## 项目结构（仓库根目录）

当前仓库路径：`cool-service/`

### 根目录

- `api/`：后端服务（Node.js + TypeScript）
- `vue/`：前端工程（Vite + Vue3 + TypeScript）
- `README.md`：仓库说明与运行方式
- `start-dev.js`：一键安装并启动前后端

### 后端（`api/`）

#### 顶层目录

- `src/`：后端源码
- `dist/`：构建产物
- `public/`：静态资源
- `test/`：测试
- `typings/`：类型声明
- `Dockerfile`、`docker-compose.yml`：容器化相关
- `cool.sqlite`：SQLite 数据库文件

#### 源码目录（`api/src/`）

- `comm/`
- `config/`
- `modules/`：业务模块
- `configuration.ts`
- `entities.ts`
- `interface.ts`

#### 业务模块（`api/src/modules/`）

- `base/`
- `demo/`
- `dict/`
- `plugin/`
- `recycle/`
- `space/`
- `swagger/`
- `task/`
- `user/`

### 前端（`vue/`）

#### 顶层目录

- `src/`：前端源码
- `public/`：静态资源
- `packages/`：工作区包（pnpm workspace / monorepo）
- `build/`：构建相关
- `vite.config.ts`：Vite 配置
- `tailwind.config.js`：Tailwind 配置
- `pnpm-workspace.yaml`：pnpm workspace 配置

#### 源码目录（`vue/src/`）

- `App.vue`
- `main.ts`
- `config/`
- `cool/`：框架/基础能力
- `plugins/`
- `modules/`：业务模块
- `shims-vue.d.ts`

#### 业务模块（`vue/src/modules/`）

- `base/`
- `demo/`
- `dict/`
- `helper/`
- `recycle/`
- `space/`
- `task/`
- `user/`

