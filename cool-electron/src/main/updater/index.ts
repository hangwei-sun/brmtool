import { app, ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater'

type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

interface UpdateStatus {
  phase: UpdatePhase
  message: string
  currentVersion: string
  latestVersion?: string
  percent?: number
  transferred?: number
  total?: number
  bytesPerSecond?: number
  error?: string
}

let registered = false
let downloaded = false
let lastStatus: UpdateStatus = {
  phase: 'idle',
  message: '尚未检查更新',
  currentVersion: app.getVersion()
}

function canUseUpdater() {
  return app.isPackaged || process.env.BRMTOOL_ENABLE_DEV_UPDATER === '1'
}

function statusPayload(payload: Omit<UpdateStatus, 'currentVersion'>): UpdateStatus {
  return {
    currentVersion: app.getVersion(),
    ...payload
  }
}

function sendStatus(getMainWindow: () => BrowserWindow | null, status: UpdateStatus) {
  lastStatus = status
  getMainWindow()?.webContents.send('updater:status', status)
}

function setupAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  log.initialize()
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => {
    sendStatus(
      getMainWindow,
      statusPayload({
        phase: 'checking',
        message: '正在检查更新'
      })
    )
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    downloaded = false
    sendStatus(
      getMainWindow,
      statusPayload({
        phase: 'available',
        message: `发现新版本 ${info.version}，正在下载`,
        latestVersion: info.version
      })
    )
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    downloaded = false
    sendStatus(
      getMainWindow,
      statusPayload({
        phase: 'not-available',
        message: '当前已是最新版本',
        latestVersion: info.version
      })
    )
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendStatus(
      getMainWindow,
      statusPayload({
        phase: 'downloading',
        message: `正在下载更新 ${Math.floor(progress.percent || 0)}%`,
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      })
    )
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    downloaded = true
    sendStatus(
      getMainWindow,
      statusPayload({
        phase: 'downloaded',
        message: '更新已下载，重启后安装',
        latestVersion: info.version,
        percent: 100
      })
    )
  })

  autoUpdater.on('error', (error: Error) => {
    downloaded = false
    sendStatus(
      getMainWindow,
      statusPayload({
        phase: 'error',
        message: '更新检查失败',
        error: error.message
      })
    )
  })
}

async function checkForUpdates(getMainWindow: () => BrowserWindow | null) {
  if (!canUseUpdater()) {
    const status = statusPayload({
      phase: 'not-available',
      message: '开发模式未启用更新检查'
    })
    sendStatus(getMainWindow, status)
    return { success: true, data: status }
  }

  try {
    await autoUpdater.checkForUpdates()
    return { success: true, data: lastStatus }
  } catch (error) {
    const status = statusPayload({
      phase: 'error',
      message: '更新检查失败',
      error: (error as Error).message
    })
    sendStatus(getMainWindow, status)
    return { success: false, data: status, error: status.error }
  }
}

export function registerUpdaterHandlers(getMainWindow: () => BrowserWindow | null): void {
  if (registered) {
    return
  }

  registered = true
  setupAutoUpdater(getMainWindow)

  ipcMain.handle('updater:check', async () => checkForUpdates(getMainWindow))
  ipcMain.handle('updater:install', () => {
    if (!downloaded) {
      return { success: false, error: '更新包尚未下载完成' }
    }

    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true)
    })
    return { success: true }
  })
  ipcMain.handle('updater:get-status', () => ({ success: true, data: lastStatus }))

  app.whenReady().then(() => {
    setTimeout(() => {
      void checkForUpdates(getMainWindow)
    }, 3000)
  })
}
