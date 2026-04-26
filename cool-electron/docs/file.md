# 文件系统模块

## 模块说明

`src/main/file/` 模块演示如何在 Electron 中通过 IPC 调用系统文件对话框并读取本地文件，展示桌面应用特有的文件系统访问能力。

**模块文件：** `src/main/file/index.ts`  
**注册入口：** `src/main/index.ts`  
**Preload 桥接：** `src/preload/index.ts`  
**Renderer 类型：** `src/preload/index.d.ts`

---

## Channel 列表

| Channel | 方向 | 类型 | 说明 |
|---------|------|------|------|
| `file:open-dialog` | Renderer → Main | `invoke / handle` | 打开系统文件选择对话框 |
| `file:read` | Renderer → Main | `invoke / handle` | 读取指定路径文件内容 |

---

## file:open-dialog

### 说明

调用 Electron `dialog.showOpenDialog` 打开系统原生文件选择框，返回用户选择的文件路径。

### Renderer 调用

```typescript
const path = await window.api.openFileDialog()
// 用户取消时返回 null
if (path) {
  console.log('选中文件：', path)
}
```

### Main 处理

```typescript
ipcMain.handle('file:open-dialog', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: '文本文件', extensions: ['txt', 'md', 'json', ...] },
      { name: '所有文件', extensions: ['*'] },
    ],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})
```

### 返回值

```typescript
string | null  // 文件路径，用户取消则返回 null
```

---

## file:read

### 说明

读取指定路径文件内容，超过 8KB 时自动截断，返回内容和元信息。

### Renderer 调用

```typescript
const result = await window.api.readFile('/path/to/file.txt')

if (result.success) {
  console.log(result.content)     // 文件内容
  console.log(result.sizeLabel)   // "12.3 KB"
  console.log(result.truncated)   // 是否被截断
} else {
  console.error(result.error)
}
```

### 返回值结构

```typescript
interface FileReadResult {
  success: boolean
  content?: string       // 文件文本内容（截断时为前 8KB）
  truncated?: boolean    // 是否因超出限制而截断
  sizeBytes?: number     // 文件实际大小（字节）
  sizeLabel?: string     // 格式化大小（如 "12.3 KB"）
  error?: string         // 失败时的错误信息
}
```

---

## 注册方式

```typescript
// src/main/index.ts
import { registerFileHandlers } from './file'

app.whenReady().then(() => {
  registerFileHandlers(() => mainWindow)
})
```

---

## 扩展建议

如需在此模块中新增文件能力，参考如下方向：

| Channel（建议命名） | 说明 |
|---------------------|------|
| `file:save-dialog` | 打开保存对话框，写入文件 |
| `file:watch` | 监听文件变化，通过推送通知 Renderer |
| `file:open-folder` | 用系统文件管理器打开目录（`shell.showItemInFolder`） |
