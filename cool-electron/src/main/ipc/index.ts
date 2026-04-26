import { ipcMain, BrowserWindow } from 'electron'
import os from 'os'

// 推送定时器句柄
let pushTimer: ReturnType<typeof setInterval> | null = null

/**
 * 注册所有 IPC 通信处理器
 * @param getMainWindow 获取主窗口实例的回调，避免直接持有引用导致内存泄漏
 */
export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  // ── 模式一：Renderer → Main（请求响应）──────────────────────────────
  // channel: ipc:get-system-info
  // Renderer 通过 ipcRenderer.invoke 发起请求，Main 返回系统信息
  ipcMain.handle('ipc:get-system-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      freeMem: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      versions: {
        electron: process.versions.electron,
        node: process.versions.node,
        chrome: process.versions.chrome,
        v8: process.versions.v8
      }
    }
  })

  // ── 模式二：Main → Renderer（主动推送）─────────────────────────────
  // channel: ipc:push-start
  // Renderer 发送该消息，触发 Main 开始定时推送心跳数据
  ipcMain.on('ipc:push-start', () => {
    // 防止重复启动
    if (pushTimer) return

    let count = 0
    pushTimer = setInterval(() => {
      const win = getMainWindow()
      if (!win || win.isDestroyed()) return

      count++
      // 通过 webContents.send 主动推送给 Renderer
      win.webContents.send('ipc:push-message', {
        id: count,
        time: new Date().toISOString(),
        message: `心跳包 #${count}`,
        memFree: (os.freemem() / 1024 / 1024).toFixed(0) + ' MB',
        load: os.loadavg()[0].toFixed(2)
      })
    }, 1000)
  })

  // channel: ipc:push-stop
  // Renderer 发送该消息，停止推送
  ipcMain.on('ipc:push-stop', () => {
    if (pushTimer) {
      clearInterval(pushTimer)
      pushTimer = null
    }
  })
}
