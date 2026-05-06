import { ElectronAPI } from '@electron-toolkit/preload'

/** 系统信息（ipc:get-system-info 返回值） */
export interface SystemInfo {
  platform: string
  arch: string
  hostname: string
  cpus: number
  totalMem: string
  freeMem: string
  versions: {
    electron: string
    node: string
    chrome: string
    v8: string
  }
}

/** Main 推送的消息结构（ipc:push-message payload） */
export interface PushMessage {
  id: number
  time: string
  message: string
  memFree: string
  load: string
}

/** 文件读取结果（file:read 返回值） */
export interface FileReadResult {
  success: boolean
  content?: string
  truncated?: boolean
  sizeBytes?: number
  sizeLabel?: string
  error?: string
}

/** 通知发送结果（notification:send 返回值） */
export interface NotificationResult {
  success: boolean
  error?: string
}

/** HTTP 请求结果（request:fetch 返回值） */
export interface FetchResult {
  success: boolean
  status?: number
  statusText?: string
  elapsed?: number
  data?: unknown
  error?: string
}

export interface ToolboxRequestPayload {
  path: string
  method?: 'GET' | 'POST'
  data?: unknown
  token?: string
}

export interface ToolboxRequestResult {
  success: boolean
  status?: number
  elapsed?: number
  data?: unknown
  error?: string
}

export interface AuthSession {
  token?: string
  refreshToken?: string
  expire?: number
  refreshExpire?: number
  user?: unknown
}

export interface UpdateStatus {
  phase:
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
  message: string
  currentVersion: string
  latestVersion?: string
  percent?: number
  transferred?: number
  total?: number
  bytesPerSecond?: number
  error?: string
}

export interface UpdateResult {
  success: boolean
  data?: UpdateStatus
  error?: string
}

export interface PluginUpdateInstallItem {
  code: string
  version: string
  packageUrl: string
  checksum?: string
}

export interface PluginUpdateInstallResult {
  success: boolean
  data?: {
    list: Array<{
      code: string
      version: string
      success: boolean
      error?: string
    }>
  }
  error?: string
}

/** 暴露给 Renderer 的完整 IPC API 类型定义 */
export interface IpcApi {
  // IPC 通信模块
  getSystemInfo: () => Promise<SystemInfo>
  startPush: () => void
  stopPush: () => void
  onPushMessage: (callback: (data: PushMessage) => void) => void
  offPushMessage: () => void
  // 文件系统模块
  openFileDialog: () => Promise<string | null>
  readFile: (filePath: string) => Promise<FileReadResult>
  // 系统通知模块
  sendNotification: (title: string, body: string) => Promise<NotificationResult>
  // HTTP 请求模块
  fetchUrl: (url: string, method?: string) => Promise<FetchResult>
  // APP 后端模块
  appRequest: (payload: ToolboxRequestPayload) => Promise<ToolboxRequestResult>
  getAuthSession: () => Promise<AuthSession>
  setAuthSession: (session: AuthSession) => Promise<NotificationResult>
  clearAuthSession: () => Promise<NotificationResult>
  // 工具箱模块
  toolboxRequest: (payload: ToolboxRequestPayload) => Promise<ToolboxRequestResult>
  openExternalTool: (url: string) => Promise<NotificationResult>
  // 在线更新模块
  checkForUpdates: () => Promise<UpdateResult>
  installUpdate: () => Promise<NotificationResult>
  getUpdateStatus: () => Promise<UpdateResult>
  onUpdateStatus: (callback: (data: UpdateStatus) => void) => void
  offUpdateStatus: () => void
  // 插件模块
  installPluginUpdates: (updates: PluginUpdateInstallItem[]) => Promise<PluginUpdateInstallResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: IpcApi
  }
}
