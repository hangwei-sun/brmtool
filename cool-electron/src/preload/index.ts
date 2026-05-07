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
  fetchUrl: (url: string, method?: string) => ipcRenderer.invoke('request:fetch', { url, method }),

  // ── APP 后端模块（Renderer → Main）──────────────────────────────────
  /** 请求 APP 后端接口，仅允许 /app/toolbox、/app/user、/app/message 白名单路径 */
  appRequest: (payload: { path: string; method?: string; data?: unknown }) =>
    ipcRenderer.invoke('app:request', payload),

  /** 获取本机登录态 */
  getAuthSession: () => ipcRenderer.invoke('auth:get-session'),

  /** 保存本机登录态 */
  setAuthSession: (session: unknown) => ipcRenderer.invoke('auth:set-session', session),

  /** 清除本机登录态 */
  clearAuthSession: () => ipcRenderer.invoke('auth:clear-session'),

  // ── 工具箱模块（Renderer → Main）──────────────────────────────────
  /** 请求工具箱后端接口，兼容旧调用；实际走 APP 白名单 */
  toolboxRequest: (payload: { path: string; method?: string; data?: unknown }) =>
    ipcRenderer.invoke('toolbox:request', payload),

  /** 使用系统浏览器打开工具外链 */
  openExternalTool: (url: string) => ipcRenderer.invoke('toolbox:open-external', url),

  // ── 在线更新模块（Renderer → Main）────────────────────────────────
  /** 主动检查桌面端更新 */
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),

  /** 安装已下载的更新 */
  installUpdate: () => ipcRenderer.invoke('updater:install'),

  /** 获取最近一次更新状态 */
  getUpdateStatus: () => ipcRenderer.invoke('updater:get-status'),

  /** 监听更新状态 */
  onUpdateStatus: (callback: (data: unknown) => void) => {
    ipcRenderer.on('updater:status', (_event, data) => callback(data))
  },

  /** 取消监听更新状态 */
  offUpdateStatus: () => {
    ipcRenderer.removeAllListeners('updater:status')
  },

  // ── 插件模块（Renderer → Main）────────────────────────────────────
  /** 下载并校验插件更新包 */
  installPluginUpdates: (
    updates: Array<{ code: string; version: string; packageUrl: string; checksum?: string }>
  ) => ipcRenderer.invoke('plugin:install-updates', updates),

  // ── AI 模块（Renderer → Main）────────────────────────────────────
  /** 开始 AI 流式请求 */
  startAiStream: (payload: { requestId: string; path: string; method?: string; data?: unknown }) =>
    ipcRenderer.invoke('ai:stream-start', payload),

  /** 停止 AI 流式请求 */
  stopAiStream: (requestId: string) => ipcRenderer.invoke('ai:stream-stop', requestId),

  /** 监听 AI 流式事件 */
  onAiStreamEvent: (callback: (data: unknown) => void) => {
    ipcRenderer.on('ai:stream-event', (_event, data) => callback(data))
  },

  /** 取消监听 AI 流式事件 */
  offAiStreamEvent: () => {
    ipcRenderer.removeAllListeners('ai:stream-event')
  }
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
