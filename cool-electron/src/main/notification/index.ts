import { ipcMain, Notification } from 'electron'

/**
 * 注册系统通知相关 IPC 处理器
 */
export function registerNotificationHandlers(): void {
  // 发送系统级桌面通知
  ipcMain.handle('notification:send', (_event, payload: { title: string; body: string }) => {
    if (!Notification.isSupported()) {
      return { success: false, error: '当前系统不支持桌面通知' }
    }

    try {
      const notification = new Notification({
        title: payload.title || 'cool-electron',
        body: payload.body || ''
      })
      notification.show()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
