import { ipcMain } from 'electron'

// 请求超时时间（毫秒）
const TIMEOUT_MS = 10_000

/**
 * 注册外部 HTTP 请求相关 IPC 处理器
 * 在 Main 进程发起网络请求，绕过浏览器 CORS 限制
 */
export function registerRequestHandlers(): void {
  // 发起 HTTP 请求，返回状态码、耗时和响应体
  ipcMain.handle('request:fetch', async (_event, payload: { url: string; method?: string }) => {
    const { url, method = 'GET' } = payload

    if (!url || !url.startsWith('http')) {
      return { success: false, error: '请输入合法的 HTTP/HTTPS 地址' }
    }

    const startAt = Date.now()

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: { 'User-Agent': 'cool-electron/1.0' }
      })

      clearTimeout(timer)

      const elapsed = Date.now() - startAt
      const contentType = response.headers.get('content-type') ?? ''

      // 根据 Content-Type 决定如何解析响应体
      let data: unknown
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        elapsed,
        data
      }
    } catch (err) {
      const elapsed = Date.now() - startAt
      const message =
        (err as Error).name === 'AbortError' ? '请求超时（超过 10s）' : (err as Error).message
      return { success: false, elapsed, error: message }
    }
  })
}
