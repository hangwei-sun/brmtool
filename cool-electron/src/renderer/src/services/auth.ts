interface ApiEnvelope<T> {
  code?: number
  message?: string
  data?: T
}

const FALLBACK_SESSION_KEY = 'brmtool.auth.session.v1'

export interface AppUser {
  id: number
  phone?: string
  nickName?: string
  avatarUrl?: string
  status?: number
  description?: string
}

export interface AuthSession {
  token?: string
  refreshToken?: string
  expire?: number
  refreshExpire?: number
  user?: AppUser
}

export async function getStoredSession() {
  if (typeof window.api.getAuthSession === 'function') {
    const session = (await window.api.getAuthSession()) as AuthSession
    return session.token ? session : readFallbackSession()
  }
  return readFallbackSession()
}

export async function setStoredSession(session: AuthSession) {
  writeFallbackSession(session)
  if (typeof window.api.setAuthSession === 'function') {
    await window.api.setAuthSession(session)
  }
}

export async function clearStoredSession() {
  localStorage.removeItem(FALLBACK_SESSION_KEY)
  if (typeof window.api.clearAuthSession === 'function') {
    await window.api.clearAuthSession()
  }
}

export async function loginByPassword(phone: string, password: string) {
  const data = await appRequest<Omit<AuthSession, 'user'>>('/app/user/login/password', 'POST', {
    phone,
    password
  })
  const user = await fetchPersonWithToken(data.token)
  const session = { ...data, user }
  await setStoredSession(session)
  return session
}

export async function fetchPerson() {
  return await appRequest<AppUser>('/app/user/info/person')
}

export async function updatePerson(data: Pick<AppUser, 'nickName' | 'avatarUrl' | 'description'>) {
  await appRequest('/app/user/info/updatePerson', 'POST', data)
  const user = await fetchPerson()
  const session = await getStoredSession()
  await setStoredSession({ ...session, user })
  return user
}

export async function updatePasswordByOld(oldPassword: string, newPassword: string) {
  return await appRequest('/app/user/info/updatePasswordByOld', 'POST', {
    oldPassword,
    newPassword
  })
}

async function fetchPersonWithToken(token?: string) {
  if (token) {
    await setStoredSession({ token })
  }
  return await fetchPerson()
}

async function appRequest<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown) {
  const session = readFallbackSession()
  const request = typeof window.api.appRequest === 'function' ? window.api.appRequest : window.api.toolboxRequest
  if (typeof request !== 'function') {
    throw new Error('应用 IPC 未初始化，请重启桌面端')
  }

  const result = await request({ path, method, data, token: session.token })
  if (!result.success) {
    throw new Error(result.error || '应用接口请求失败')
  }

  const envelope = result.data as ApiEnvelope<T>
  if (typeof envelope?.code === 'number' && envelope.code !== 1000) {
    throw new Error(envelope.message || '应用接口返回异常')
  }

  return envelope.data as T
}

function readFallbackSession(): AuthSession {
  try {
    const value = localStorage.getItem(FALLBACK_SESSION_KEY)
    return value ? (JSON.parse(value) as AuthSession) : {}
  } catch {
    return {}
  }
}

function writeFallbackSession(session: AuthSession) {
  try {
    localStorage.setItem(FALLBACK_SESSION_KEY, JSON.stringify(session || {}))
  } catch {}
}
