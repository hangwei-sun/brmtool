import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 暴露给 Renderer 的类型安全 IPC API
const api = {
  // ── IPC 模块：请求响应（Renderer → Main）────────────────────────────
  /** 获取系统信息，返回 Promise */
  getSystemInfo: () => ipcRenderer.invoke('ipc:get-system-info'),

  // ── IPC 模块：主动推送（Main ↔ Renderer）────────────────────────────
  /** 通知 Main 开始推送 */
  startPush: () => ipcRenderer.send('ipc:push-start'),

  /** 通知 Main 停止推送 */
  stopPush: () => ipcRenderer.send('ipc:push-stop'),

  /** 监听 Main 推送的消息 */
  onPushMessage: (callback: (data: unknown) => void) => {
    ipcRenderer.on('ipc:push-message', (_event, data) => callback(data))
  },

  /** 取消监听推送消息，组件卸载时调用 */
  offPushMessage: () => {
    ipcRenderer.removeAllListeners('ipc:push-message')
  },

  // ── 文件系统模块（Renderer → Main）──────────────────────────────────
  /** 打开系统文件选择对话框，返回选中路径或 null */
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),

  /** 读取指定路径文件内容 */
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

  // ── 系统通知模块（Renderer → Main）──────────────────────────────────
  /** 发送系统级桌面通知 */
  sendNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:send', { title, body }),

  // ── HTTP 请求模块（Renderer → Main）─────────────────────────────────
  /** 通过 Main 进程发起外部 HTTP 请求，绕过浏览器 CORS 限制 */
  fetchUrl: (url: string, method?: string) => ipcRenderer.invoke('request:fetch', { url, method })
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
