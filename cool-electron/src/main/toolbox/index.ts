import { app, ipcMain, shell } from 'electron'
import { readFileSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

const DEFAULT_DEV_API_BASE = 'http://127.0.0.1:8001'
const DEFAULT_PROD_API_BASE = 'https://deploy-domain.example/api'
const TIMEOUT_MS = 8000
const ALLOWED_METHODS = new Set(['GET', 'POST'])
const APP_PATH_PREFIXES = ['/app/toolbox/', '/app/user/', '/app/message/']
const SESSION_FILE = 'brmtool-auth-session.json'

interface AppRequestPayload {
  path: string
  method?: string
  data?: unknown
  token?: string
}

interface AuthSession {
  token?: string
  refreshToken?: string
  expire?: number
  refreshExpire?: number
  user?: unknown
}

function hasPathTraversal(path: string) {
  const pathname = path.split(/[?#]/)[0]

  try {
    return pathname.split('/').some((item) => item === '..' || decodeURIComponent(item) === '..')
  } catch {
    return true
  }
}

function isAllowedAppPath(pathname: string) {
  return APP_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function apiBaseUrl() {
  const value = process.env.BRMTOOL_API_BASE || (app.isPackaged ? DEFAULT_PROD_API_BASE : DEFAULT_DEV_API_BASE)
  return new URL(value.endsWith('/') ? value : `${value}/`)
}

function normalizeAppApiUrl(path: string) {
  if (!path || typeof path !== 'string') {
    throw new Error('请求路径不能为空')
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//') || path.includes('\\')) {
    throw new Error('请求路径不在应用白名单内')
  }

  if (!isAllowedAppPath(path) || hasPathTraversal(path)) {
    throw new Error('请求路径不在应用白名单内')
  }

  const pathUrl = new URL(path, 'http://brmtool.local')
  const baseUrl = apiBaseUrl()
  const basePath = baseUrl.pathname.replace(/\/$/, '')
  const targetUrl = new URL(baseUrl.toString())

  targetUrl.pathname = `${basePath}${pathUrl.pathname}`
  targetUrl.search = pathUrl.search
  targetUrl.hash = ''

  if (targetUrl.origin !== baseUrl.origin || !isAllowedAppPath(pathUrl.pathname)) {
    throw new Error('请求路径不在应用白名单内')
  }

  return targetUrl.toString()
}

function normalizeUrl(url: string) {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('只允许打开 HTTP/HTTPS 外部链接')
  }
  return parsed.toString()
}

function sessionPath() {
  return join(app.getPath('userData'), SESSION_FILE)
}

function readSession(): AuthSession {
  try {
    const file = sessionPath()
    if (!existsSync(file)) return {}
    return JSON.parse(readFileSync(file, 'utf8')) as AuthSession
  } catch {
    return {}
  }
}

function writeSession(session: AuthSession) {
  writeFileSync(sessionPath(), JSON.stringify(session, null, 2), 'utf8')
}

function clearSession() {
  try {
    rmSync(sessionPath(), { force: true })
  } catch {}
}

async function refreshSession(session: AuthSession) {
  if (!session.refreshToken) {
    return null
  }

  const response = await fetch(normalizeAppApiUrl('/app/user/login/refreshToken'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'brmtool-electron/1.0'
    },
    body: JSON.stringify({ refreshToken: session.refreshToken })
  })
  const data = await response.json().catch(() => null)
  const next = data?.data
  if (!response.ok || !next?.token) {
    clearSession()
    return null
  }

  const refreshed = { ...session, ...next }
  writeSession(refreshed)
  return refreshed
}

async function sendAppRequest(payload: AppRequestPayload, retry = true) {
  const method = (payload.method || 'GET').toUpperCase()

  if (!ALLOWED_METHODS.has(method)) {
    return { success: false, error: '不支持的请求方法' }
  }

  const startAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const requestUrl = normalizeAppApiUrl(payload.path)
    const session = readSession()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'brmtool-electron/1.0'
    }

    const token = payload.token || session.token
    if (token) {
      headers.Authorization = token
    }

    const response = await fetch(requestUrl, {
      method,
      signal: controller.signal,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(payload.data || {})
    })

    if (
      response.status === 401 &&
      retry &&
      session.refreshToken &&
      !payload.path.includes('/app/user/login/refreshToken')
    ) {
      clearTimeout(timer)
      const refreshed = await refreshSession(session)
      return refreshed ? sendAppRequest(payload, false) : { success: false, status: 401, error: '登录失效' }
    }

    const data = await response.json().catch(() => null)
    return {
      success: response.ok,
      status: response.status,
      elapsed: Date.now() - startAt,
      data,
      error: response.ok ? undefined : data?.message || response.statusText
    }
  } catch (err) {
    const message =
      (err as Error).name === 'AbortError' ? '应用接口请求超时' : (err as Error).message
    return { success: false, elapsed: Date.now() - startAt, error: message }
  } finally {
    clearTimeout(timer)
  }
}

export function registerToolboxHandlers(): void {
  ipcMain.handle('app:request', async (_event, payload: AppRequestPayload) => sendAppRequest(payload))
  ipcMain.handle('toolbox:request', async (_event, payload: AppRequestPayload) => sendAppRequest(payload))
  ipcMain.handle('auth:get-session', () => readSession())
  ipcMain.handle('auth:set-session', (_event, session: AuthSession) => {
    writeSession(session || {})
    return { success: true }
  })
  ipcMain.handle('auth:clear-session', () => {
    clearSession()
    return { success: true }
  })

  ipcMain.handle('toolbox:open-external', async (_event, url: string) => {
    try {
      await shell.openExternal(normalizeUrl(url))
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
