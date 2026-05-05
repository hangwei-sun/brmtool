# 1Panel / 宝塔部署说明

## 基础约定

- 访问域名：`tool.baotounews.cn`
- 部署形态：同域名分路径
  - 管理端和下载页：`https://tool.baotounews.cn/`
  - 后端接口：`https://tool.baotounews.cn/api`
  - 桌面端更新包：`https://tool.baotounews.cn/updates/desktop`
- 推荐目录：
  - 项目源码：`/opt/brmtool/source`
  - 管理端静态资源：`/var/www/brmtool/admin`
  - 更新包目录：`/var/www/brmtool/updates/desktop`
  - 后端运行目录：`/opt/brmtool/api`
- Node.js：`>=18`，推荐 `22.x`
- MySQL：创建 `brmtool` 数据库，字符集 `utf8mb4`

## 后端部署

1. 在 1Panel/宝塔安装 Node.js、MySQL，并确认服务器能访问 `127.0.0.1:3306`。
2. 创建数据库：

```sql
CREATE DATABASE brmtool DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. 上传或拉取项目后，在后端目录安装并构建：

```bash
cd /opt/brmtool/source/cool-service-master/api
pnpm install --frozen-lockfile
pnpm build
```

4. 创建真实环境变量文件，不提交到 Git：

```bash
cp .env.production.example .env.production
```

填写生产数据库连接，例如：

```env
BRMTOOL_PORT=8001
BRMTOOL_DB_HOST=127.0.0.1
BRMTOOL_DB_PORT=3306
BRMTOOL_DB_USER=brmtool
BRMTOOL_DB_PASSWORD=<数据库密码>
BRMTOOL_DB_NAME=brmtool
```

5. 用 1Panel/宝塔进程守护或 PM2 启动：

```bash
NODE_ENV=production node ./bootstrap.js
```

或：

```bash
pnpm pm2:start
```

后端只监听内网端口 `8001`，不要直接对公网暴露。

## 管理端和下载页部署

```bash
cd /opt/brmtool/source/cool-service-master/vue
pnpm install --frozen-lockfile
pnpm build
rm -rf /var/www/brmtool/admin/*
cp -R dist/* /var/www/brmtool/admin/
```

确认生产环境变量：

```env
VITE_PUBLIC_ORIGIN=https://tool.baotounews.cn
VITE_DESKTOP_DOWNLOAD_MAC_URL=/updates/desktop/BRMTool-latest-mac.dmg
VITE_DESKTOP_DOWNLOAD_WINDOWS_URL=/updates/desktop/BRMTool-latest-windows.exe
```

## 站点配置

1. 在 1Panel/宝塔创建站点：`tool.baotounews.cn`。
2. 站点根目录指向：`/var/www/brmtool/admin`。
3. 申请并启用 HTTPS 证书。
4. 在站点 Nginx 配置中合并 `docs/deploy/nginx.brmtool.conf.example` 的关键 location：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /updates/desktop/ {
    alias /var/www/brmtool/updates/desktop/;
    autoindex off;
    add_header Cache-Control "public, max-age=60";
    types {
        application/x-yaml yml yaml;
        application/octet-stream blockmap dmg exe zip;
    }
}

location / {
    try_files $uri $uri/ /index.html;
}
```

如果面板已经生成了 SSL、server_name、root 等配置，不要重复创建第二个 `server` 块，只合并上面的 `location`。

## 桌面端更新包

1. 通过 GitHub Actions `Desktop Build` 工作流构建 macOS/Windows 内测包，输入域名 `tool.baotounews.cn`。
2. 上传构建产物到：

```text
/var/www/brmtool/updates/desktop
```

必须包含：

- `latest.yml`
- `latest-mac.yml`
- macOS 安装包和 blockmap
- Windows 安装包和 blockmap

建议额外放置稳定别名，供下载页使用：

- `BRMTool-latest-mac.dmg`
- `BRMTool-latest-windows.exe`

## 发布前检查

在源码目录执行：

```bash
DEPLOY_DOMAIN=tool.baotounews.cn node scripts/check-release-config.mjs --strict
UPDATE_DIR=/var/www/brmtool/updates/desktop DEPLOY_DOMAIN=tool.baotounews.cn node scripts/check-release-config.mjs --strict
```

## 上线验证

```bash
curl https://tool.baotounews.cn/api/app/toolbox/home
curl https://tool.baotounews.cn/api/admin/base/open/eps
```

浏览器验证：

- `https://tool.baotounews.cn/`
- `https://tool.baotounews.cn/download`

桌面端验证：

- 登录、退出登录
- 首页工具加载和排序
- 收藏同步
- 站内消息
- 内嵌 WebView 打开
- 检查更新、下载更新、重启安装
