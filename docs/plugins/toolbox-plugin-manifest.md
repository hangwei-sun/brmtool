# 工具箱 Web 沙箱插件规范

第一版第三方插件只允许作为 Web 沙箱运行，不允许 Node、本机命令、子进程或任意文件系统访问。

## plugin.json

```json
{
  "code": "demo-plugin",
  "name": "Demo 插件",
  "version": "1.0.0",
  "entry": "index.html",
  "icon": "PLG",
  "permissions": ["network:app-api", "storage:plugin"],
  "minAppVersion": "1.0.0"
}
```

字段说明：

- `code`：全局唯一插件编码，小写字母开头，只允许小写字母、数字和短横线。
- `name`：插件展示名称。
- `version`：插件版本号，用于桌面端检查更新。
- `entry`：插件 Web 入口。zip 上传时建议填写包内相对路径，例如 `index.html`；后台解析后会生成 `/plugins/<code>/<version>/index.html` 静态入口。手工维护时只允许可信 `https://` 地址或 `/plugins/` 相对路径。
- `icon`：工具卡片图标，可用短文本或图片地址。
- `permissions`：第一版只支持 `network:app-api`、`storage:plugin`、`notification:readonly`。
- `minAppVersion`：最低桌面端版本。
- `checksum`：后台上传 zip 后自动生成 `sha256:<hash>`。
- `packageUrl`：后台上传 zip 后自动生成 `/plugins/<code>/<version>.zip`。

zip 包根目录必须包含 `plugin.json`，入口文件不能使用绝对路径、反斜杠或 `..` 路径穿越。

## 沙箱能力

插件页面运行在 Electron `<webview>` 中，默认配置：

- `sandbox=yes`
- `nodeIntegration=no`
- `contextIsolation=yes`
- 无 shell、文件系统、子进程能力

桌面端通过 `window.brmtoolPlugin` 暴露受限能力：

```ts
window.brmtoolPlugin.getUser()
window.brmtoolPlugin.request({ path: "/app/toolbox/usage", method: "POST", data: {} })
window.brmtoolPlugin.storage.getItem("key")
window.brmtoolPlugin.storage.setItem("key", "value")
window.brmtoolPlugin.storage.removeItem("key")
```

`request` 只能访问 `/app/toolbox/**` 白名单路径。
