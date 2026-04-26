import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'

// 文件内容预览最大字节数（超出则截断）
const MAX_PREVIEW_BYTES = 8 * 1024

/**
 * 注册文件系统相关 IPC 处理器
 * @param getMainWindow 获取主窗口实例的回调
 */
export function registerFileHandlers(getMainWindow: () => BrowserWindow | null): void {
  // 打开文件选择对话框，返回选中的文件路径
  ipcMain.handle('file:open-dialog', async () => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? new BrowserWindow({ show: false }), {
      properties: ['openFile'],
      filters: [
        {
          name: '文本文件',
          extensions: ['txt', 'md', 'json', 'js', 'ts', 'vue', 'css', 'html', 'yaml', 'toml']
        },
        { name: '所有文件', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // 读取文件内容，超大文件自动截断
  ipcMain.handle('file:read', (_event, filePath: string) => {
    try {
      const stat = fs.statSync(filePath)
      const sizeBytes = stat.size

      let content: string
      let truncated = false

      if (sizeBytes > MAX_PREVIEW_BYTES) {
        // 超出限制，只读取前 8KB
        const buf = Buffer.alloc(MAX_PREVIEW_BYTES)
        const fd = fs.openSync(filePath, 'r')
        fs.readSync(fd, buf, 0, MAX_PREVIEW_BYTES, 0)
        fs.closeSync(fd)
        content = buf.toString('utf-8')
        truncated = true
      } else {
        content = fs.readFileSync(filePath, 'utf-8')
      }

      return {
        success: true,
        content,
        truncated,
        sizeBytes,
        sizeLabel: formatFileSize(sizeBytes)
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
