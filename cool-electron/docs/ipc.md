# IPC 通信模块

## 模块说明

`src/main/ipc/` 模块负责注册主进程（Main）所有 IPC 通信处理器，演示 Electron 中两种经典的进程间通信模式。

**模块文件：** `src/main/ipc/index.ts`  
**注册入口：** `src/main/index.ts`  
**Preload 桥接：** `src/preload/index.ts`  
**Renderer 类型：** `src/preload/index.d.ts`

---

## 通信架构

```
Renderer (Vue)
    │
    │  window.api.xxx()
    ▼
Preload (contextBridge)
    │
    │  ipcRenderer.invoke / ipcRenderer.send
    ▼
Main (ipcMain.handle / ipcMain.on)
    │
    │  webContents.send（仅推送模式）
    ▼
Preload → Renderer（回调触发）
```

---

## 模式一：请求 / 响应

Renderer 主动发起请求，等待 Main 返回结果（类似异步函数调用）。

### Channel

| Channel | 方向 | 类型 |
|---------|------|------|
| `ipc:get-system-info` | Renderer → Main | `invoke / handle` |

### Renderer 调用

```typescript
const info = await window.api.getSystemInfo()
```

### Main 处理

```typescript
ipcMain.handle('ipc:get-system-info', () => {
  return {
    platform, arch, hostname, cpus, totalMem, freeMem, versions
  }
})
```

### 返回值结构

```typescript
interface SystemInfo {
  platform: string      // 操作系统平台（darwin / win32 / linux）
  arch: string          // CPU 架构（x64 / arm64 等）
  hostname: string      // 主机名
  cpus: number          // CPU 核心数
  totalMem: string      // 总内存（格式：X.XX GB）
  freeMem: string       // 可用内存（格式：X.XX GB）
  versions: {
    electron: string    // Electron 版本
    node: string        // Node.js 版本
    chrome: string      // Chromium 版本
    v8: string          // V8 引擎版本
  }
}
```

---

## 模式二：主动推送

Main 进程主动向 Renderer 推送消息，Renderer 通过监听接收数据（类似事件订阅）。

### Channel

| Channel | 方向 | 类型 | 说明 |
|---------|------|------|------|
| `ipc:push-start` | Renderer → Main | `send / on` | 通知 Main 开始定时推送 |
| `ipc:push-stop` | Renderer → Main | `send / on` | 通知 Main 停止推送 |
| `ipc:push-message` | Main → Renderer | `webContents.send` | Main 推送心跳消息 |

### Renderer 调用

```typescript
// 开始接收推送
window.api.startPush()

// 注册消息回调
window.api.onPushMessage((data) => {
  console.log(data.message)
})

// 停止推送
window.api.stopPush()

// 取消监听（组件卸载时调用）
window.api.offPushMessage()
```

### Main 处理

```typescript
// 接收开始推送指令
ipcMain.on('ipc:push-start', () => {
  pushTimer = setInterval(() => {
    win.webContents.send('ipc:push-message', { id, time, message, memFree, load })
  }, 1000)
})

// 接收停止推送指令
ipcMain.on('ipc:push-stop', () => {
  clearInterval(pushTimer)
  pushTimer = null
})
```

### 推送消息结构

```typescript
interface PushMessage {
  id: number        // 消息序号，从 1 开始递增
  time: string      // ISO 格式时间戳（new Date().toISOString()）
  message: string   // 消息文本（如：心跳包 #1）
  memFree: string   // 当前可用内存（格式：XXXX MB）
  load: string      // 1 分钟平均系统负载（macOS / Linux）
}
```

---

## 注册方式

在 `src/main/index.ts` 中导入并调用，传入 `mainWindow` 的 getter 函数：

```typescript
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

app.whenReady().then(() => {
  // 注册 IPC 模块，传入 getter 避免直接持有窗口引用
  registerIpcHandlers(() => mainWindow)
  createWindow()
})
```

---

## 新增 Channel 说明

如需在此模块中新增通信 channel，请遵循以下步骤：

1. 在 `src/main/ipc/index.ts` 的 `registerIpcHandlers` 函数内新增 handler
2. 在 `src/preload/index.ts` 的 `api` 对象中新增对应方法
3. 在 `src/preload/index.d.ts` 的 `IpcApi` 接口中新增类型声明
4. 在本文档中补充 Channel 说明、入参和返回值
