export interface DesktopUpdateStatus {
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

export async function getUpdateStatus() {
  const result = await window.api.getUpdateStatus()
  if (!result.success) {
    throw new Error(result.error || '获取更新状态失败')
  }
  return result.data
}

export async function checkForUpdates() {
  const result = await window.api.checkForUpdates()
  if (!result.success) {
    throw new Error(result.error || '检查更新失败')
  }
  return result.data
}

export async function installUpdate() {
  const result = await window.api.installUpdate()
  if (!result.success) {
    throw new Error(result.error || '更新包尚未准备好')
  }
  return result
}

export function onUpdateStatus(callback: (status: DesktopUpdateStatus) => void) {
  window.api.onUpdateStatus(callback)
}

export function offUpdateStatus() {
  window.api.offUpdateStatus()
}
