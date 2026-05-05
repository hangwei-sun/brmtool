# 数智工具箱上线发布步骤

## 1. 生产环境变量

- 后端：复制 `cool-service-master/api/.env.production.example` 为 `.env.production`，填写真实数据库连接信息。
- 管理端：复制 `cool-service-master/vue/.env.production.example` 为 `.env.production`，填写真实 `VITE_PUBLIC_ORIGIN`。
- 桌面端：复制 `cool-electron/.env.production.example` 为 `.env.production`，填写真实 `BRMTOOL_API_BASE`。
- 禁止提交真实 `.env.production`、数据库密码、签名证书和发布 token。

上线前先用真实域名收敛所有生产占位：

```bash
DEPLOY_DOMAIN=toolbox.example.com node scripts/configure-deploy.mjs
node scripts/check-release-config.mjs --strict
```

如需同时检查更新包目录：

```bash
UPDATE_DIR=/var/www/brmtool/updates/desktop node scripts/check-release-config.mjs --strict
```

## 2. 后端

```bash
cd cool-service-master/api
pnpm lint
pnpm build
NODE_ENV=production node ./bootstrap.js
```

经 Nginx 验证：

```bash
curl https://deploy-domain.example/api/app/toolbox/home
curl https://deploy-domain.example/api/admin/base/open/eps
```

## 3. 管理端

```bash
cd cool-service-master/vue
pnpm type-check
pnpm build
```

将 `dist/` 上传到 Nginx 站点根目录，例如 `/var/www/brmtool/admin`。

## 4. 桌面端

```bash
cd cool-electron
pnpm typecheck
pnpm build
pnpm build:mac --publish never
pnpm build:win --publish never
```

将安装包、`latest.yml`、`latest-mac.yml`、`.blockmap` 上传到 `/var/www/brmtool/updates/desktop`。

也可以在 GitHub Actions 手动运行 `Desktop Build` 工作流，输入真实 `deploy_domain` 后分别产出 macOS 和 Windows artifact。Windows 安装包优先使用该工作流或 Windows 机器构建，避免 Apple Silicon 本机 wine 兼容问题。

上传后再次检查更新目录：

```bash
UPDATE_DIR=/var/www/brmtool/updates/desktop node scripts/check-release-config.mjs --strict
```

## 5. 回滚

- 后端：保留上一版进程包或镜像，异常时切回上一版并重启。
- 管理端：保留上一版 `dist` 目录，异常时切换 Nginx root 或覆盖回上一版。
- 桌面端：保留上一版更新产物和 `latest*.yml`，异常时恢复上一版元数据，让客户端重新指向稳定版本。
