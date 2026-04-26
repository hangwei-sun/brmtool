# 系统通知模块

## 模块说明

`src/main/notification/` 模块演示如何通过 Electron 发送操作系统原生桌面通知，展示桌面应用与系统层交互的能力。

**模块文件：** `src/main/notification/index.ts`  
**注册入口：** `src/main/index.ts`  
**Preload 桥接：** `src/preload/index.ts`  
**Renderer 类型：** `src/preload/index.d.ts`

---

## Channel 列表

| Channel | 方向 | 类型 | 说明 |
|---------|------|------|------|
| `notification:send` | Renderer → Main | `invoke / handle` | 发送系统级桌面通知 |

---

## notification:send

### 说明

调用 Electron `Notification` API 发送系统原生通知。通知在系统通知中心弹出，与前台/后台状态无关。

### Renderer 调用

```typescript
const result = await window.api.sendNotification('通知标题', '通知内容')

if (result.success) {
  console.log('通知已发送')
} else {
  console.error('发送失败：', result.error)
}
```

### Main 处理

```typescript
ipcMain.handle('notification:send', (_event, { title, body }) => {
  if (!Notification.isSupported()) {
    return { success: false, error: '当前系统不支持桌面通知' }
  }
  const notification = new Notification({ title, body })
  notification.show()
  return { success: true }
})
```

### 入参结构

```typescript
{
  title: string   // 通知标题
  body: string    // 通知正文
}
```

### 返回值结构

```typescript
interface NotificationResult {
  success: boolean
  error?: string   // 失败时的错误原因
}
```

---

## 平台说明

| 平台 | 说明 |
|------|------|
| macOS | 通知显示在右上角，进入通知中心 |
| Windows | Toast 通知，显示在任务栏右下角 |
| Linux | 依赖 libnotify，需要通知守护进程 |

> `Notification.isSupported()` 会在不支持的环境中返回 `false`，模块已做降级处理。

---

## 注册方式

```typescript
// src/main/index.ts
import { registerNotificationHandlers } from './notification'

app.whenReady().then(() => {
  registerNotificationHandlers()  // 无需传入 mainWindow
})
```

---

## 扩展建议

| Channel（建议命名） | 说明 |
|---------------------|------|
| `notification:send-with-action` | 带点击回调的通知（通知被点击时通知 Renderer） |
| `notification:badge` | 设置 Dock/任务栏图标角标数字（macOS/Windows） |
