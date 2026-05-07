import { app, ipcMain, shell } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { readFileSync, writeFileSync, rmSync, existsSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

const DEFAULT_DEV_API_BASE = 'http://127.0.0.1:8001'
const DEFAULT_PROD_API_BASE = 'https://tool.baotounews.cn/api'
const DEFAULT_APP_TIMEOUT_MS = 8000
const AI_APP_TIMEOUT_MS = 300000
const AI_LIST_TIMEOUT_MS = 30000
const ALLOWED_METHODS = new Set(['GET', 'POST'])
const APP_PATH_PREFIXES = ['/app/toolbox/', '/app/user/', '/app/message/', '/app/ai/']
const PLUGIN_PATH_PREFIXES = ['/app/toolbox/']
const SESSION_FILE = 'brmtool-auth-session.json'
const PLUGIN_STATE_FILE = 'brmtool-plugin-state.json'

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

interface PluginUpdatePayload {
  code: string
  version: string
  packageUrl: string
  checksum?: string
}

interface AiStreamPayload extends AppRequestPayload {
  requestId: string
}

const aiStreamControllers = new Map<string, AbortController>()

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

function isAllowedPluginPath(pathname: string) {
  return PLUGIN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function appRequestTimeoutMs(path: string) {
  if (path.startsWith('/app/ai/generate') || path.startsWith('/app/ai/generations/sync')) {
    return AI_APP_TIMEOUT_MS
  }
  if (path.startsWith('/app/ai/')) {
    return AI_LIST_TIMEOUT_MS
  }
  return DEFAULT_APP_TIMEOUT_MS
}

function appRequestTimeoutMessage(path: string) {
  if (path.startsWith('/app/ai/generate') || path.startsWith('/app/ai/generations/sync')) {
    return 'AI 生成请求超时，请稍后重试或到后台确认模型服务状态'
  }
  return '应用接口请求超时'
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

function pluginStatePath() {
  return join(app.getPath('userData'), PLUGIN_STATE_FILE)
}

function pluginPackageDir(code: string) {
  return join(app.getPath('userData'), 'toolbox-plugins', normalizePluginCode(code))
}

function readPluginState(): Record<string, unknown> {
  try {
    const file = pluginStatePath()
    if (!existsSync(file)) return {}
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
  } catch {
    return {}
  }
}

function writePluginState(state: Record<string, unknown>) {
  writeFileSync(pluginStatePath(), JSON.stringify(state, null, 2), 'utf8')
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
  const timer = setTimeout(() => controller.abort(), appRequestTimeoutMs(payload.path))

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

    const data = normalizeResponseMediaUrls(await response.json().catch(() => null)) as {
      message?: string
    } | null
    return {
      success: response.ok,
      status: response.status,
      elapsed: Date.now() - startAt,
      data,
      error: response.ok ? undefined : data?.message || response.statusText
    }
  } catch (err) {
    const message =
      (err as Error).name === 'AbortError'
        ? appRequestTimeoutMessage(payload.path)
        : (err as Error).message
    return { success: false, elapsed: Date.now() - startAt, error: message }
  } finally {
    clearTimeout(timer)
  }
}

function normalizeResponseMediaUrls(value: unknown): unknown {
  if (typeof value === 'string') {
    return normalizeStaticMediaUrl(value)
  }

  if (Array.isArray(value)) {
    return value.map(normalizeResponseMediaUrls)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeResponseMediaUrls(item)])
    )
  }

  return value
}

function normalizeStaticMediaUrl(value: string) {
  if (!value.startsWith('/upload/') && !value.startsWith('/plugins/') && !/^https?:\/\//i.test(value)) {
    return value
  }

  const baseUrl = apiBaseUrl()
  const origin = baseUrl.origin

  if (value.startsWith('/upload/') || value.startsWith('/plugins/')) {
    return `${origin}${value}`
  }

  try {
    const url = new URL(value)
    const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
    const isStaticFile = url.pathname.startsWith('/upload/') || url.pathname.startsWith('/plugins/')

    return isLocal && isStaticFile ? `${origin}${url.pathname}${url.search}` : value
  } catch {
    return value
  }
}

function normalizePluginCode(code: string) {
  const value = String(code || '').trim()
  if (!/^[a-z][a-z0-9-]{1,78}$/.test(value)) {
    throw new Error('插件编码不合法')
  }
  return value
}

function normalizePluginPackageUrl(value: string) {
  const apiBase = apiBaseUrl()
  const originBase = new URL(apiBase.origin)
  const url = value.startsWith('/plugins/') ? new URL(value, originBase) : new URL(value)
  if (url.protocol !== 'https:' && !(url.hostname === '127.0.0.1' || url.hostname === 'localhost')) {
    throw new Error('插件包仅允许可信 HTTPS 或本地调试地址')
  }
  if (value.startsWith('/plugins/') && !url.pathname.startsWith('/plugins/')) {
    throw new Error('插件包路径不在白名单内')
  }
  if (hasPathTraversal(url.pathname)) {
    throw new Error('插件包路径不合法')
  }
  return url.toString()
}

function assertPackageChecksum(buffer: Buffer, checksum?: string) {
  if (!checksum) {
    return
  }
  const expected = checksum.replace(/^sha256:/i, '').toLowerCase()
  const actual = createHash('sha256').update(buffer).digest('hex')
  if (expected !== actual) {
    throw new Error('插件包 checksum 校验失败')
  }
}

async function installPluginUpdates(updates: PluginUpdatePayload[]) {
  const result: Array<{ code: string; version: string; success: boolean; error?: string }> = []
  const state = readPluginState()

  for (const item of Array.isArray(updates) ? updates : []) {
    try {
      const code = normalizePluginCode(item.code)
      const version = String(item.version || '').trim()
      if (!version || !item.packageUrl) {
        throw new Error('插件版本或下载地址为空')
      }

      const url = normalizePluginPackageUrl(item.packageUrl)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`插件包下载失败：${response.status}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      assertPackageChecksum(buffer, item.checksum)

      const dir = pluginPackageDir(code)
      mkdirSync(dir, { recursive: true })
      const tempPath = join(dir, `${version}.zip.tmp`)
      const finalPath = join(dir, `${version}.zip`)
      writeFileSync(tempPath, buffer)
      rmSync(finalPath, { force: true })
      renameSync(tempPath, finalPath)

      state[code] = {
        version,
        packageUrl: url,
        checksum: item.checksum,
        installedAt: new Date().toISOString()
      }
      result.push({ code, version, success: true })
    } catch (err) {
      result.push({
        code: item?.code || '',
        version: item?.version || '',
        success: false,
        error: (err as Error).message
      })
    }
  }

  writePluginState(state)
  return { success: true, data: { list: result } }
}

async function sendPluginRequest(payload: AppRequestPayload & { pluginCode?: string }) {
  const pathUrl = new URL(payload.path || '', 'http://brmtool.local')
  if (!isAllowedPluginPath(pathUrl.pathname) || hasPathTraversal(payload.path)) {
    return { success: false, error: '插件请求路径不在白名单内' }
  }
  return sendAppRequest(payload)
}

async function startAiStream(event: IpcMainInvokeEvent, payload: AiStreamPayload) {
  const requestId = String(payload.requestId || '')
  if (!requestId) {
    return { success: false, error: 'AI 请求 ID 不能为空' }
  }

  const method = (payload.method || 'POST').toUpperCase()
  if (method !== 'POST') {
    return { success: false, error: 'AI 流式请求仅支持 POST' }
  }

  const controller = new AbortController()
  aiStreamControllers.set(requestId, controller)

  const send = (data: Record<string, unknown>) => {
    event.sender.send('ai:stream-event', { requestId, ...data })
  }

  try {
    const requestUrl = normalizeAppApiUrl(payload.path)
    const session = readSession()
    const token = payload.token || session.token
    const response = await fetch(requestUrl, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'brmtool-electron/1.0',
        ...(token ? { Authorization: token } : {})
      },
      body: JSON.stringify(payload.data || {})
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.message || response.statusText || 'AI 流式请求失败')
    }

    if (!response.body) {
      throw new Error('AI 流式响应为空')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''

      for (const line of lines) {
        const text = line.trim()
        if (!text.startsWith('data:')) continue
        const raw = text.replace(/^data:\s*/, '')
        try {
          send(JSON.parse(raw))
        } catch {}
      }
    }

    send({ type: 'closed' })
    return { success: true }
  } catch (err) {
    const message = (err as Error).name === 'AbortError' ? 'AI 生成已停止' : (err as Error).message
    send({ type: 'error', error: message })
    return { success: false, error: message }
  } finally {
    aiStreamControllers.delete(requestId)
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

  ipcMain.handle('plugin:get-user', () => {
    const session = readSession()
    return { success: true, data: session.user || null }
  })

  ipcMain.handle('plugin:request', async (_event, payload: AppRequestPayload & { pluginCode?: string }) => {
    try {
      if (payload.pluginCode) {
        normalizePluginCode(payload.pluginCode)
      }
      return await sendPluginRequest(payload)
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('plugin:install-updates', async (_event, updates: PluginUpdatePayload[]) => {
    try {
      return await installPluginUpdates(updates)
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:stream-start', async (event, payload: AiStreamPayload) => startAiStream(event, payload))
  ipcMain.handle('ai:stream-stop', (_event, requestId: string) => {
    aiStreamControllers.get(String(requestId))?.abort()
    aiStreamControllers.delete(String(requestId))
    return { success: true }
  })
}
