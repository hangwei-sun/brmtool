# 数智工具箱宝塔部署小白完整方案

本文档面向第一次上线部署，目标是在宝塔环境下完成：

- 管理后台和下载页：`https://tool.baotounews.cn/`
- 后端接口：`https://tool.baotounews.cn/api`
- 上传文件访问：`https://tool.baotounews.cn/upload/...`
- 插件静态文件访问：`https://tool.baotounews.cn/plugins/...`
- 桌面端更新包：`https://tool.baotounews.cn/updates/desktop`
- 桌面端下载页：`https://tool.baotounews.cn/download`
- Electron 在线更新：客户端检查 `latest.yml` / `latest-mac.yml` 后自动下载并提示重启安装

当前方案采用同一个域名分路径部署，后端只监听服务器本机 `127.0.0.1:8001`，外网只开放 `80/443`。

---

## 1. 部署架构

```text
用户浏览器 / 桌面端
        |
        | HTTPS
        v
https://tool.baotounews.cn
        |
        |-- /                         -> 管理端静态文件 dist
        |-- /download                 -> 管理端里的公开下载页
        |-- /api/*                    -> 反代到后端 http://127.0.0.1:8001/*
        |-- /upload/*                 -> 反代到后端 http://127.0.0.1:8001/upload/*
        |-- /plugins/*                -> 反代到后端 http://127.0.0.1:8001/plugins/*
        |-- /updates/desktop/*        -> 宝塔静态目录，放桌面端安装包和更新元数据
```

推荐目录：

```text
/www/wwwroot/brmtool/source                      # 项目源码
/www/wwwroot/tool.baotounews.cn/admin            # 管理端 dist 静态资源
/www/wwwroot/tool.baotounews.cn/updates/desktop  # 桌面端更新包目录
/www/server/panel/vhost/nginx                    # 宝塔站点 Nginx 配置目录，面板自动管理
```

---

## 2. 宝塔服务器准备

### 2.1 基础环境

在宝塔面板安装：

- Nginx：推荐稳定版
- MySQL：5.7/8.0 均可，推荐 8.0
- Node.js：推荐 `22.x`，最低 `18.x`
- PM2 管理器：用于守护后端进程
- Git：用于拉取代码

如果宝塔软件商店没有合适 Node 版本，也可以用命令安装：

```bash
node -v
npm -v

npm i -g pnpm@10.33.0 pm2
pnpm -v
pm2 -v
```

### 2.2 域名解析

到域名 DNS 控制台添加：

```text
类型：A
主机记录：tool
记录值：你的服务器公网 IP
```

等待解析生效：

```bash
ping tool.baotounews.cn
```

### 2.3 防火墙

宝塔和云服务器安全组都要放行：

```text
80   HTTP
443  HTTPS
```

不要放行 `8001` 给公网。后端端口只给本机 Nginx 反代访问。

---

## 3. 创建数据库

进入宝塔面板：

1. 打开「数据库」
2. 新增数据库
3. 数据库名：`brmtool`
4. 用户名：建议 `brmtool`
5. 密码：生成强密码，记下来
6. 编码：`utf8mb4`

也可以命令创建：

```sql
CREATE DATABASE brmtool DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'brmtool'@'127.0.0.1' IDENTIFIED BY '替换成强密码';
GRANT ALL PRIVILEGES ON brmtool.* TO 'brmtool'@'127.0.0.1';
FLUSH PRIVILEGES;
```

---

## 4. 上传或拉取项目源码

推荐把源码放在：

```bash
mkdir -p /www/wwwroot/brmtool
cd /www/wwwroot/brmtool
```

方式一：Git 拉取：

```bash
git clone <你的仓库地址> source
cd /www/wwwroot/brmtool/source
```

方式二：本地打包上传：

1. 本地压缩项目目录
2. 宝塔「文件」上传到 `/www/wwwroot/brmtool`
3. 解压后改名为 `source`

确认目录结构：

```text
/www/wwwroot/brmtool/source
  ├── cool-service-master/api
  ├── cool-service-master/vue
  ├── cool-electron
  ├── scripts
  └── docs
```

---

## 5. 后端部署

后端目录：

```bash
cd /www/wwwroot/brmtool/source/cool-service-master/api
```

### 5.1 安装依赖

```bash
pnpm install --frozen-lockfile
```

如果服务器依赖安装慢，可以设置国内源：

```bash
pnpm config set registry https://registry.npmmirror.com
```

### 5.2 配置生产环境变量

复制示例文件：

```bash
cp .env.production.example .env.production
```

编辑 `.env.production`：

```bash
vim .env.production
```

推荐内容：

```env
BRMTOOL_PORT=8001
BRMTOOL_DB_HOST=127.0.0.1
BRMTOOL_DB_PORT=3306
BRMTOOL_DB_USER=brmtool
BRMTOOL_DB_PASSWORD=替换成数据库密码
BRMTOOL_DB_NAME=brmtool
BRMTOOL_PUBLIC_ORIGIN=https://tool.baotounews.cn

# AI Key 可以先留空，后续优先到后台 AI 模型管理里配置
BRMTOOL_DEEPSEEK_API_KEY=
BRMTOOL_DEEPSEEK_BASE_URL=https://api.deepseek.com
BRMTOOL_VOLCENGINE_API_KEY=
BRMTOOL_VOLCENGINE_ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

说明：

- `BRMTOOL_PORT=8001`：后端监听本机端口
- `BRMTOOL_PUBLIC_ORIGIN`：本地上传图片、视频时生成公网访问地址
- `.env.production` 禁止提交到 Git

### 5.3 首次初始化数据库

这个项目生产配置里：

```text
synchronize=false
initDB=false
initMenu=false
```

这是正确的上线配置，避免线上误删表。但第一次空数据库没有表，需要先初始化一次。

#### 方案 A：推荐，导入已有数据库

如果你本地已经调好了数据，推荐直接导出本地数据库再导入服务器。

本地导出：

```bash
mysqldump -h127.0.0.1 -uroot -p brmtool > brmtool.sql
```

上传 `brmtool.sql` 到服务器后导入：

```bash
mysql -h127.0.0.1 -ubrmtool -p brmtool < brmtool.sql
```

#### 方案 B：空库首次自动建表

只允许在空数据库第一次执行。

创建 `.env.local`：

```bash
cp .env.local.example .env.local
vim .env.local
```

填写和生产库一样的连接：

```env
BRMTOOL_DB_HOST=127.0.0.1
BRMTOOL_DB_PORT=3306
BRMTOOL_DB_USER=brmtool
BRMTOOL_DB_PASSWORD=替换成数据库密码
BRMTOOL_DB_NAME=brmtool
BRMTOOL_PUBLIC_ORIGIN=https://tool.baotounews.cn
```

运行一次本地模式，让框架建表、初始化菜单：

```bash
pnpm dev
```

看到服务启动成功后，等待 30 秒左右，然后按 `Ctrl + C` 停止。

重要提醒：

- 这个步骤只用于空库首次初始化
- 已有正式数据后不要再随便跑 `pnpm dev`
- 正式运行必须用生产模式

### 5.4 构建后端

```bash
pnpm build
```

### 5.5 启动后端

先手动测试启动：

```bash
NODE_ENV=production node ./bootstrap.js
```

打开另一个终端测试：

```bash
curl http://127.0.0.1:8001/app/toolbox/home
```

如果返回 JSON，说明后端正常。

停止手动进程后，用 PM2 守护：

```bash
cd /www/wwwroot/brmtool/source/cool-service-master/api
NODE_ENV=production pm2 start ./bootstrap.js --name brmtool-api
pm2 save
pm2 status
```

常用 PM2 命令：

```bash
pm2 status
pm2 logs brmtool-api
pm2 restart brmtool-api
pm2 stop brmtool-api
```

宝塔里也可以使用「PM2 管理器」添加：

```text
项目名称：brmtool-api
启动文件：/www/wwwroot/brmtool/source/cool-service-master/api/bootstrap.js
运行目录：/www/wwwroot/brmtool/source/cool-service-master/api
环境变量：NODE_ENV=production
端口：8001
```

---

## 6. 管理端和下载页部署

管理端目录：

```bash
cd /www/wwwroot/brmtool/source/cool-service-master/vue
```

### 6.1 配置生产环境变量

创建 `.env.production`：

```bash
cp .env.production.example .env.production
vim .env.production
```

内容：

```env
VITE_PUBLIC_ORIGIN=https://tool.baotounews.cn
VITE_DESKTOP_DOWNLOAD_MAC_URL=/updates/desktop/BRMTool-latest-mac.dmg
VITE_DESKTOP_DOWNLOAD_WINDOWS_URL=/updates/desktop/BRMTool-latest-windows.exe
```

说明：

- 管理端 API 固定走 `/api`
- `/download` 页面读取这里的下载地址
- 下载地址可以先配置，文件后面再上传

### 6.2 安装依赖和构建

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm build
```

构建成功后会生成：

```text
cool-service-master/vue/dist
```

### 6.3 复制到站点目录

```bash
mkdir -p /www/wwwroot/tool.baotounews.cn/admin
rm -rf /www/wwwroot/tool.baotounews.cn/admin/*
cp -R dist/* /www/wwwroot/tool.baotounews.cn/admin/
```

---

## 7. 宝塔站点和 Nginx 配置

### 7.1 创建站点

宝塔面板：

1. 打开「网站」
2. 添加站点
3. 域名：`tool.baotounews.cn`
4. 根目录：`/www/wwwroot/tool.baotounews.cn/admin`
5. PHP：纯静态可选，不需要 PHP

### 7.2 开启 HTTPS

宝塔面板：

1. 进入站点设置
2. SSL
3. 申请 Let's Encrypt 证书
4. 勾选强制 HTTPS

### 7.3 配置反向代理和静态目录

进入站点设置 -> 配置文件，找到当前 `server { ... }`，不要新建第二个 `server`。

在 `server` 内加入或合并以下配置：

```nginx
client_max_body_size 200m;

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

location /upload/ {
    proxy_pass http://127.0.0.1:8001/upload/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /plugins/ {
    proxy_pass http://127.0.0.1:8001/plugins/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /updates/desktop/ {
    alias /www/wwwroot/tool.baotounews.cn/updates/desktop/;
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

然后点击保存，并在宝塔里重载 Nginx。

命令行检查 Nginx：

```bash
nginx -t
service nginx reload
```

### 7.4 创建更新包目录

```bash
mkdir -p /www/wwwroot/tool.baotounews.cn/updates/desktop
```

---

## 8. 后台基础验证

浏览器打开：

```text
https://tool.baotounews.cn/
```

接口检查：

```bash
curl https://tool.baotounews.cn/api/app/toolbox/home
curl https://tool.baotounews.cn/api/admin/base/open/eps
```

下载页检查：

```text
https://tool.baotounews.cn/download
```

上传目录检查：

1. 后台上传一张图片
2. 确认返回地址类似：

```text
https://tool.baotounews.cn/upload/202605xx/xxx.png
```

3. 浏览器能直接打开该图片

如果 `/upload/...` 打不开，优先检查 Nginx 是否添加了 `location /upload/`。

---

## 9. 桌面端生产配置

桌面端目录：

```bash
cd /www/wwwroot/brmtool/source/cool-electron
```

当前项目约定：

- 生产 API：`https://tool.baotounews.cn/api`
- 在线更新地址：`https://tool.baotounews.cn/updates/desktop`
- `electron-builder.yml` 使用 `generic provider`

上线前建议执行一次配置收敛：

```bash
cd /www/wwwroot/brmtool/source
DEPLOY_DOMAIN=tool.baotounews.cn node scripts/configure-deploy.mjs
node scripts/check-release-config.mjs
```

严格检查：

```bash
DEPLOY_DOMAIN=tool.baotounews.cn node scripts/check-release-config.mjs --strict
```

---

## 10. 桌面端构建

### 10.1 版本号规则

每次要让老客户端检测到更新，都必须提升桌面端版本号。

文件：

```text
cool-electron/package.json
```

例如：

```json
{
  "version": "1.0.1"
}
```

升级时从 `1.0.0` 改成 `1.0.1`，再构建。

### 10.2 安装依赖

```bash
cd /www/wwwroot/brmtool/source/cool-electron
pnpm install --frozen-lockfile
```

### 10.3 macOS 构建

macOS 安装包必须在 macOS 机器构建。

```bash
cd cool-electron
pnpm typecheck
pnpm build:mac --publish never
```

产物在：

```text
cool-electron/dist
```

常见文件：

```text
BRMTool-1.0.1-arm64.dmg
BRMTool-1.0.1-arm64.dmg.blockmap
BRMTool-1.0.1-mac.zip
BRMTool-1.0.1-mac.zip.blockmap
latest-mac.yml
```

实际文件名以 `dist` 目录为准。

### 10.4 Windows 构建

Windows 安装包建议用 GitHub Actions 或 Windows 机器构建，不建议在 Apple Silicon Mac 上硬打。

GitHub Actions：

1. 推送代码到 GitHub
2. 打开 GitHub 仓库
3. Actions
4. 选择 `Desktop Build`
5. 点击 `Run workflow`
6. `deploy_domain` 填：

```text
tool.baotounews.cn
```

7. `build_macos` / `build_windows` 按需选择
8. 等工作流完成后下载 artifacts

Windows 常见产物：

```text
BRMTool-1.0.1-setup-x64.exe
BRMTool-1.0.1-setup-x64.exe.blockmap
latest.yml
```

---

## 11. 上传桌面端下载和更新包

服务器目录：

```bash
mkdir -p /www/wwwroot/tool.baotounews.cn/updates/desktop
```

把 macOS 和 Windows 构建产物上传到：

```text
/www/wwwroot/tool.baotounews.cn/updates/desktop
```

必须包含：

```text
latest.yml          # Windows 更新元数据
latest-mac.yml      # macOS 更新元数据
*.exe               # Windows 安装包
*.exe.blockmap
*.dmg               # macOS 安装包
*.dmg.blockmap
*.zip               # macOS autoUpdater 常用
*.zip.blockmap
```

重要：

- 不要随便改 `latest.yml` / `latest-mac.yml` 里引用的文件名
- 安装包文件名必须和 yml 元数据里写的一致
- `.blockmap` 要一起上传，增量更新会用到

### 11.1 为下载页创建稳定别名

下载页默认链接是：

```text
/updates/desktop/BRMTool-latest-mac.dmg
/updates/desktop/BRMTool-latest-windows.exe
```

所以建议额外复制两个别名文件。

例如：

```bash
cd /www/wwwroot/tool.baotounews.cn/updates/desktop

cp BRMTool-1.0.1-arm64.dmg BRMTool-latest-mac.dmg
cp BRMTool-1.0.1-setup-x64.exe BRMTool-latest-windows.exe
```

注意：

- 别名只给下载页用
- 在线更新仍看 `latest.yml` / `latest-mac.yml`

### 11.2 检查更新目录

```bash
ls -lh /www/wwwroot/tool.baotounews.cn/updates/desktop
```

至少应该看到：

```text
latest.yml
latest-mac.yml
BRMTool-latest-mac.dmg
BRMTool-latest-windows.exe
```

访问检查：

```bash
curl -I https://tool.baotounews.cn/updates/desktop/latest.yml
curl -I https://tool.baotounews.cn/updates/desktop/latest-mac.yml
curl -I https://tool.baotounews.cn/updates/desktop/BRMTool-latest-mac.dmg
curl -I https://tool.baotounews.cn/updates/desktop/BRMTool-latest-windows.exe
```

应返回 `200`。

---

## 12. 在线更新工作原理

本项目使用：

```text
electron-updater + electron-builder generic provider
```

项目配置在：

```text
cool-electron/electron-builder.yml
```

关键配置：

```yaml
publish:
  provider: generic
  url: https://tool.baotounews.cn/updates/desktop
```

含义：

- Windows 客户端检查：`https://tool.baotounews.cn/updates/desktop/latest.yml`
- macOS 客户端检查：`https://tool.baotounews.cn/updates/desktop/latest-mac.yml`
- yml 里写明新版本号、安装包文件名、sha512、blockmap
- 客户端发现版本号更高后自动下载
- 下载完成后提示用户重启安装

来自 Electron Builder 官方文档的关键约定：

- `generic provider` 可以使用普通 HTTP/HTTPS 静态服务器
- `electron-builder --publish never` 只生成产物，不自动上传
- 手动上传时必须保留 `latest*.yml` 和安装包、blockmap 的对应关系

---

## 13. 第一次上线发布流程

### 13.1 后端

```bash
cd /www/wwwroot/brmtool/source/cool-service-master/api
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production pm2 restart brmtool-api || NODE_ENV=production pm2 start ./bootstrap.js --name brmtool-api
pm2 save
```

检查：

```bash
curl http://127.0.0.1:8001/app/toolbox/home
curl https://tool.baotounews.cn/api/app/toolbox/home
```

### 13.2 管理端

```bash
cd /www/wwwroot/brmtool/source/cool-service-master/vue
pnpm install --frozen-lockfile
pnpm type-check
pnpm build

rm -rf /www/wwwroot/tool.baotounews.cn/admin/*
cp -R dist/* /www/wwwroot/tool.baotounews.cn/admin/
```

检查：

```text
https://tool.baotounews.cn/
https://tool.baotounews.cn/download
```

### 13.3 桌面端

1. 修改 `cool-electron/package.json` 版本号
2. 构建 macOS / Windows 包
3. 上传安装包、`latest.yml`、`latest-mac.yml`、blockmap 到 `/updates/desktop`
4. 创建下载页别名
5. 检查 URL 可访问

---

## 14. 后续版本更新流程

以后每次发新版桌面端，按这个流程：

1. 修改桌面端版本号，例如 `1.0.1 -> 1.0.2`
2. 确认 `electron-builder.yml` 的 `publish.url` 是：

```text
https://tool.baotounews.cn/updates/desktop
```

3. 构建新版安装包
4. 上传新版产物到：

```text
/www/wwwroot/tool.baotounews.cn/updates/desktop
```

5. 覆盖：

```text
latest.yml
latest-mac.yml
```

6. 保留新版安装包和 blockmap
7. 更新下载页别名：

```bash
cp 新版.dmg BRMTool-latest-mac.dmg
cp 新版.exe BRMTool-latest-windows.exe
```

8. 旧客户端打开后点击「检查更新」
9. 验证发现新版本、下载、提示重启安装、升级成功

---

## 15. 在线更新测试方法

建议准备两个版本：

```text
旧版：1.0.1
新版：1.0.2
```

测试流程：

1. 先安装旧版 `1.0.1`
2. 服务器 `/updates/desktop` 上传新版 `1.0.2` 的产物
3. 确认 `latest.yml` / `latest-mac.yml` 写的是 `1.0.2`
4. 打开旧版客户端
5. 点击「检查更新」
6. 观察：
   - 能发现新版本
   - 能显示下载进度
   - 下载完成后提示重启安装
   - 重启后版本变成 `1.0.2`

如果没发现更新：

- 检查 `package.json` 版本号是否真的变大
- 检查客户端打包时的 `publish.url`
- 检查 `latest.yml` 是否可公网访问
- 检查 Nginx `/updates/desktop/` 是否返回 200
- 检查是否上传错目录

---

## 16. 下载页验证

访问：

```text
https://tool.baotounews.cn/download
```

验证：

- macOS 用户主按钮显示 macOS 下载
- Windows 用户主按钮显示 Windows 下载
- 两个平台手动下载入口都可点击
- 地址为：

```text
https://tool.baotounews.cn/updates/desktop/BRMTool-latest-mac.dmg
https://tool.baotounews.cn/updates/desktop/BRMTool-latest-windows.exe
```

如果按钮提示未配置：

- 检查 `cool-service-master/vue/.env.production`
- 重新 `pnpm build`
- 重新复制 `dist` 到站点目录

---

## 17. AI 模型配置

项目后续 AI 能力涉及 DeepSeek、火山引擎等模型。

推荐上线后在后台配置：

```text
AI 工作台 -> AI 模型管理
```

填写：

- 模型名称
- provider
- modelId / endpointId
- API Key
- 启用状态
- 默认模型

注意：

- API Key 不要写进 Git
- `.env.production` 里可以保留 fallback key，但更推荐后台模型管理维护
- 宝塔备份时注意保护数据库，因为模型 Key 可能存储在数据库中

---

## 18. 常见问题

### 18.1 后台打不开，接口 404

检查 Nginx：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8001/;
}
```

注意这里 `proxy_pass` 末尾有 `/`，表示 `/api/admin/...` 会转成后端 `/admin/...`。

### 18.2 后台能打开，但登录失败

检查：

```bash
pm2 logs brmtool-api
cat /www/wwwroot/brmtool/source/cool-service-master/api/.env.production
```

重点看：

- 数据库账号密码是否正确
- 数据库是否有表
- 后端是否生产模式启动

### 18.3 上传图片后页面无法显示

检查图片地址是否为：

```text
https://tool.baotounews.cn/upload/...
```

检查 Nginx 是否有：

```nginx
location /upload/ {
    proxy_pass http://127.0.0.1:8001/upload/;
}
```

检查后端 `.env.production`：

```env
BRMTOOL_PUBLIC_ORIGIN=https://tool.baotounews.cn
```

### 18.4 下载页能打开，但下载 404

检查文件是否存在：

```bash
ls -lh /www/wwwroot/tool.baotounews.cn/updates/desktop
```

检查别名：

```text
BRMTool-latest-mac.dmg
BRMTool-latest-windows.exe
```

### 18.5 客户端检查不到更新

检查：

```bash
curl https://tool.baotounews.cn/updates/desktop/latest.yml
curl https://tool.baotounews.cn/updates/desktop/latest-mac.yml
```

检查新版版本号是否大于旧版。

检查 `latest*.yml` 内引用的安装包文件是否也在同目录。

### 18.6 Windows 提示不安全

第一版 unsigned 内测包很常见。

公开发布前建议补：

- Windows 代码签名证书
- macOS Developer ID 签名
- macOS notarization 公证

内测阶段可以先手动允许安装。

### 18.7 macOS 提示无法打开

unsigned 包可能被 Gatekeeper 拦截。

内测临时处理：

1. 右键应用
2. 点击打开
3. 系统设置 -> 隐私与安全性 -> 仍要打开

公开发布前需要做签名和公证。

---

## 19. 发布前检查清单

后端：

- [ ] `.env.production` 已创建，且不提交 Git
- [ ] 数据库连接正确
- [ ] 首次数据库已初始化
- [ ] `pm2 status` 后端在线
- [ ] `curl http://127.0.0.1:8001/app/toolbox/home` 正常
- [ ] `curl https://tool.baotounews.cn/api/app/toolbox/home` 正常

管理端：

- [ ] `.env.production` 域名正确
- [ ] `pnpm type-check` 通过
- [ ] `pnpm build` 通过
- [ ] `dist` 已复制到站点根目录
- [ ] `https://tool.baotounews.cn/` 可访问
- [ ] `https://tool.baotounews.cn/download` 可访问

Nginx：

- [ ] `/api/` 已反代
- [ ] `/upload/` 已反代
- [ ] `/plugins/` 已反代
- [ ] `/updates/desktop/` 已 alias 到更新目录
- [ ] `client_max_body_size 200m`
- [ ] HTTPS 正常

桌面端：

- [ ] `package.json` 版本号已更新
- [ ] macOS 包已构建
- [ ] Windows 包已构建
- [ ] `latest.yml` 已上传
- [ ] `latest-mac.yml` 已上传
- [ ] 安装包和 blockmap 已上传
- [ ] 下载页别名已创建
- [ ] 旧版本客户端能检测到新版本

---

## 20. 推荐上线顺序

最稳妥的顺序：

1. 宝塔安装环境
2. 创建数据库
3. 上传源码
4. 初始化数据库
5. 启动后端
6. 配置 Nginx `/api`
7. 构建并部署管理端
8. 验证后台登录
9. 配置 `/upload` 和 `/plugins`
10. 后台上传图片验证
11. 构建桌面端安装包
12. 上传 `/updates/desktop`
13. 验证 `/download`
14. 安装旧版客户端测试在线更新
15. 内测发布

---

## 21. 回滚方案

后端回滚：

```bash
pm2 stop brmtool-api
# 切换源码到上一版
pnpm build
NODE_ENV=production pm2 start ./bootstrap.js --name brmtool-api
pm2 save
```

管理端回滚：

```bash
mv /www/wwwroot/tool.baotounews.cn/admin /www/wwwroot/tool.baotounews.cn/admin_bad
mv /www/wwwroot/tool.baotounews.cn/admin_backup /www/wwwroot/tool.baotounews.cn/admin
service nginx reload
```

桌面端更新回滚：

1. 保留上一版 `latest.yml` / `latest-mac.yml`
2. 如果新版有问题，把上一版 yml 覆盖回来
3. 确保上一版安装包还在 `/updates/desktop`
4. 客户端会重新以 yml 指向的稳定版本为准

---

## 22. 最小命令总览

后端：

```bash
cd /www/wwwroot/brmtool/source/cool-service-master/api
pnpm install --frozen-lockfile
cp .env.production.example .env.production
vim .env.production
pnpm build
NODE_ENV=production pm2 start ./bootstrap.js --name brmtool-api
pm2 save
```

管理端：

```bash
cd /www/wwwroot/brmtool/source/cool-service-master/vue
pnpm install --frozen-lockfile
cp .env.production.example .env.production
vim .env.production
pnpm type-check
pnpm build
mkdir -p /www/wwwroot/tool.baotounews.cn/admin
rm -rf /www/wwwroot/tool.baotounews.cn/admin/*
cp -R dist/* /www/wwwroot/tool.baotounews.cn/admin/
```

更新包：

```bash
mkdir -p /www/wwwroot/tool.baotounews.cn/updates/desktop
# 上传 latest.yml/latest-mac.yml/安装包/blockmap 到此目录
```

发布检查：

```bash
cd /www/wwwroot/brmtool/source
DEPLOY_DOMAIN=tool.baotounews.cn node scripts/check-release-config.mjs --strict
UPDATE_DIR=/www/wwwroot/tool.baotounews.cn/updates/desktop DEPLOY_DOMAIN=tool.baotounews.cn node scripts/check-release-config.mjs --strict
```

