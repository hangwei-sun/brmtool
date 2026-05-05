interface ApiEnvelope<T> {
  code?: number
  message?: string
  data?: T
}

export interface AppMessage {
  id: number
  title: string
  content: string
  level: 'info' | 'success' | 'warning' | 'error'
  actionType?: 'none' | 'tool' | 'link'
  actionValue?: string
  publishTime?: string
  createTime?: string
  isRead?: boolean
}

const FALLBACK_SESSION_KEY = 'brmtool.auth.session.v1'

export async function fetchMessages() {
  const data = await appRequest<{ list: AppMessage[] }>('/app/message/list?page=1&size=30')
  return data.list || []
}

export async function fetchUnreadCount() {
  const data = await appRequest<{ count: number }>('/app/message/unreadCount')
  return Number(data.count || 0)
}

export async function markMessageRead(messageId: number) {
  return await appRequest<{ read: boolean }>('/app/message/read', 'POST', { messageId })
}

export async function markAllMessagesRead() {
  return await appRequest<{ read: boolean }>('/app/message/readAll', 'POST')
}

async function appRequest<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown) {
  const request = typeof window.api.appRequest === 'function' ? window.api.appRequest : window.api.toolboxRequest
  if (typeof request !== 'function') {
    throw new Error('应用 IPC 未初始化，请重启桌面端')
  }

  const result = await request({ path, method, data, token: readToken() })
  if (!result.success) {
    throw new Error(result.error || '消息接口请求失败')
  }

  const envelope = result.data as ApiEnvelope<T>
  if (typeof envelope?.code === 'number' && envelope.code !== 1000) {
    throw new Error(envelope.message || '消息接口返回异常')
  }

  return envelope.data as T
}

function readToken() {
  try {
    const session = JSON.parse(localStorage.getItem(FALLBACK_SESSION_KEY) || '{}')
    return session.token as string | undefined
  } catch {
    return undefined
  }
}
