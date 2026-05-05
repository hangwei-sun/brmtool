export type ToolType = 'external_link' | 'internal_web' | 'local_plugin'
export type OpenMode = 'external_browser' | 'electron_window' | 'embedded_webview' | 'internal_route'

export interface ToolboxCategory {
  id: number
  name: string
  code: string
  icon: string
  sort: number
  status?: number
}

export interface ToolboxTool {
  id: number
  categoryId?: number
  name: string
  code: string
  description: string
  icon: string
  type: ToolType
  entry: string
  openMode: OpenMode
  tags: string[]
  keywords?: string
  isRecommend?: number | boolean
  isHot?: number | boolean
  isNew?: number | boolean
  authRequired?: number | boolean
  isFavorite?: boolean
}

export interface ToolboxUsageStats {
  todayCount: number
  totalCount: number
}

export interface ToolboxFeedback {
  id: number
  title: string
  content: string
  contact?: string
  status: number
  reply?: string
  createTime?: string
}

export interface ToolboxHomeData {
  categories: ToolboxCategory[]
  recommendTools: ToolboxTool[]
  newTools: ToolboxTool[]
  hotTools: ToolboxTool[]
  favoriteTools: ToolboxTool[]
  recentTools: ToolboxTool[]
  usageStats: ToolboxUsageStats
}

interface ApiEnvelope<T> {
  code?: number
  message?: string
  data?: T
}

const CACHE_KEY = 'brmtool.toolbox.home.v1'
const FAVORITE_KEY = 'brmtool.toolbox.favorites.v1'
const RECENT_KEY = 'brmtool.toolbox.recent.v1'
const USAGE_KEY = 'brmtool.toolbox.usage.v1'
const FALLBACK_SESSION_KEY = 'brmtool.auth.session.v1'

export const defaultCategories: ToolboxCategory[] = [
  { id: 101, name: '首页', code: 'all', icon: '首', sort: 0 },
  { id: 103, name: '导航', code: 'nav', icon: '航', sort: 20 },
  { id: 102, name: '工具', code: 'tool', icon: '工', sort: 10 },
  { id: 104, name: '智能', code: 'ai', icon: '智', sort: 30 },
  { id: 105, name: '学习', code: 'study', icon: '学', sort: 40 },
  { id: 106, name: '签到', code: 'checkin', icon: '签', sort: 50 }
]

export const defaultTools: ToolboxTool[] = [
  {
    id: 1001,
    categoryId: 102,
    name: 'JSON格式化',
    code: 'json-format',
    description: '格式化、压缩、校验 JSON 数据。',
    icon: '{}',
    type: 'internal_web',
    entry: '/tools/json-format',
    openMode: 'internal_route',
    tags: ['JSON', '格式化'],
    keywords: 'json jsgsh geshihua 格式化 校验 压缩',
    isRecommend: 1,
    isHot: 1,
    isNew: 1
  },
  {
    id: 1002,
    categoryId: 102,
    name: 'Base64编解码',
    code: 'base64-codec',
    description: 'Base64 文本编码和解码工具。',
    icon: 'B64',
    type: 'internal_web',
    entry: '/tools/base64',
    openMode: 'internal_route',
    tags: ['Base64', '编码'],
    keywords: 'base64 bianma jiema 编码 解码',
    isRecommend: 1,
    isHot: 1,
    isNew: 1
  },
  {
    id: 1003,
    categoryId: 102,
    name: 'URL编码',
    code: 'url-codec',
    description: 'URL encode/decode，支持常见链接、参数和值转换。',
    icon: 'URL',
    type: 'internal_web',
    entry: '/tools/url-codec',
    openMode: 'internal_route',
    tags: ['URL', '编码'],
    keywords: 'url bianma jiema encode decode 编码 解码',
    isRecommend: 1,
    isNew: 1
  },
  {
    id: 1004,
    categoryId: 102,
    name: '文本去重',
    code: 'text-dedupe',
    description: '按行去除重复文本，保留原始顺序。',
    icon: 'TXT',
    type: 'internal_web',
    entry: '/tools/text-dedupe',
    openMode: 'internal_route',
    tags: ['文本', '去重'],
    keywords: 'text quchong wenben dedupe 文本 去重',
    isRecommend: 1,
    isNew: 1
  },
  {
    id: 1005,
    categoryId: 105,
    name: 'Markdown预览',
    code: 'markdown-preview',
    description: '实时预览 Markdown 文档效果。',
    icon: 'MD',
    type: 'internal_web',
    entry: '/tools/markdown-preview',
    openMode: 'internal_route',
    tags: ['Markdown', '预览'],
    keywords: 'markdown md yulan preview 预览',
    isRecommend: 1,
    isNew: 1
  },
  {
    id: 1006,
    categoryId: 102,
    name: '时间戳转换',
    code: 'timestamp-convert',
    description: '时间戳与日期时间相互转换。',
    icon: 'CLK',
    type: 'internal_web',
    entry: '/tools/timestamp',
    openMode: 'internal_route',
    tags: ['时间', '时间戳'],
    keywords: 'timestamp shijianchuo time 时间 时间戳 转换',
    isRecommend: 1,
    isHot: 1,
    isNew: 1
  },
  {
    id: 1007,
    categoryId: 103,
    name: 'COOL Admin文档',
    code: 'cool-admin-docs',
    description: '打开 COOL Admin Node 官方文档。',
    icon: 'DOC',
    type: 'external_link',
    entry: 'https://node.cool-admin.com/src/introduce/',
    openMode: 'embedded_webview',
    tags: ['文档', 'COOL'],
    keywords: 'cool admin docs 文档',
    isNew: 1
  },
  {
    id: 1008,
    categoryId: 102,
    name: '留言板',
    code: 'feedback-board',
    description: '登录用户提交工具箱使用建议，管理员后台可查看处理。',
    icon: 'MSG',
    type: 'local_plugin',
    entry: 'feedback-board',
    openMode: 'internal_route',
    tags: ['建议', '反馈'],
    keywords: 'feedback liuyan jianyi 留言 建议 反馈',
    isRecommend: 1,
    isNew: 1,
    authRequired: 1
  }
]

export const defaultHome: ToolboxHomeData = {
  categories: defaultCategories,
  recommendTools: defaultTools.filter((tool) => isTruthy(tool.isRecommend)),
  newTools: defaultTools.filter((tool) => isTruthy(tool.isNew)),
  hotTools: defaultTools.filter((tool) => isTruthy(tool.isHot)),
  favoriteTools: defaultTools.slice(0, 5).map((tool) => ({ ...tool, isFavorite: true })),
  recentTools: defaultTools.slice(0, 3),
  usageStats: { todayCount: 23, totalCount: 96 }
}

export function isTruthy(value: unknown) {
  return value === true || value === 1 || value === '1'
}

export function mergeTools(...groups: ToolboxTool[][]) {
  const map = new Map<number, ToolboxTool>()
  groups.flat().forEach((tool) => {
    map.set(tool.id, normalizeTool({ ...map.get(tool.id), ...tool }))
  })
  return Array.from(map.values())
}

export function normalizeTool(tool: ToolboxTool): ToolboxTool {
  return {
    ...tool,
    icon: normalizeIcon(tool.icon, tool.code),
    tags: Array.isArray(tool.tags) ? tool.tags : [],
    isRecommend: isTruthy(tool.isRecommend),
    isHot: isTruthy(tool.isHot),
    isNew: isTruthy(tool.isNew),
    authRequired: isTruthy(tool.authRequired)
  }
}

export function normalizeCategory(category: ToolboxCategory): ToolboxCategory {
  return {
    ...category,
    icon: normalizeCategoryIcon(category.icon, category.code),
    name: category.code === 'all' ? '首页' : category.name
  }
}

export function normalizeHome(home: ToolboxHomeData): ToolboxHomeData {
  return {
    categories: home.categories.map(normalizeCategory),
    recommendTools: home.recommendTools.map(normalizeTool),
    newTools: home.newTools.map(normalizeTool),
    hotTools: home.hotTools.map(normalizeTool),
    favoriteTools: home.favoriteTools.map((tool) => normalizeTool({ ...tool, isFavorite: true })),
    recentTools: home.recentTools.map(normalizeTool),
    usageStats: home.usageStats || { todayCount: 0, totalCount: 0 }
  }
}

export async function fetchToolboxHome() {
  const data = await toolboxRequest<ToolboxHomeData>('/app/toolbox/home')
  return normalizeHome(data)
}

export async function fetchToolboxTools(params: {
  categoryId?: number
  keyword?: string
  sort?: string
}) {
  const query = new URLSearchParams()
  if (params.categoryId) query.set('categoryId', String(params.categoryId))
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.sort) query.set('sort', params.sort)
  query.set('page', '1')
  query.set('size', '40')

  const data = await toolboxRequest<{ list: ToolboxTool[] }>(`/app/toolbox/tools?${query}`)
  return data.list.map(normalizeTool)
}

export async function toggleFavoriteRemote(toolId: number) {
  return await toolboxRequest<{ favorited: boolean }>('/app/toolbox/favorite', 'POST', { toolId })
}

export async function recordUsageRemote(toolId: number) {
  return await toolboxRequest<{ recorded: boolean }>('/app/toolbox/usage', 'POST', {
    toolId,
    clientType: 'electron'
  })
}

export async function fetchMyFeedback() {
  return await toolboxRequest<ToolboxFeedback[]>('/app/toolbox/feedback/mine')
}

export async function submitFeedback(data: { title: string; content: string; contact?: string }) {
  return await toolboxRequest<{ id: number }>('/app/toolbox/feedback/submit', 'POST', data)
}

async function toolboxRequest<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown) {
  const request = typeof window.api.appRequest === 'function' ? window.api.appRequest : window.api.toolboxRequest
  if (typeof request !== 'function') {
    throw new Error('工具箱 IPC 未初始化，请重启桌面端')
  }

  const result = await request({ path, method, data, token: readToken() })
  if (!result.success) {
    throw new Error(result.error || '工具箱接口请求失败')
  }

  const envelope = result.data as ApiEnvelope<T>
  if (typeof envelope?.code === 'number' && envelope.code !== 1000) {
    throw new Error(envelope.message || '工具箱接口返回异常')
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

export function readCachedHome() {
  return readJson<ToolboxHomeData>(CACHE_KEY)
}

export function writeCachedHome(data: ToolboxHomeData) {
  writeJson(CACHE_KEY, data)
}

export function readFavoriteIds() {
  return new Set(readJson<number[]>(FAVORITE_KEY) || defaultHome.favoriteTools.map((tool) => tool.id))
}

export function writeFavoriteIds(ids: Set<number>) {
  writeJson(FAVORITE_KEY, Array.from(ids))
}

export function readRecentTools() {
  return readJson<ToolboxTool[]>(RECENT_KEY) || defaultHome.recentTools
}

export function writeRecentTools(tools: ToolboxTool[]) {
  writeJson(RECENT_KEY, tools.slice(0, 8))
}

export function readUsageStats() {
  return readJson<ToolboxUsageStats>(USAGE_KEY) || defaultHome.usageStats
}

export function writeUsageStats(stats: ToolboxUsageStats) {
  writeJson(USAGE_KEY, stats)
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 缓存失败不影响工具箱主流程
  }
}

function normalizeIcon(icon: string, code: string) {
  const map: Record<string, string> = {
    braces: '{}',
    base64: 'B64',
    link: 'URL',
    'file-text': 'TXT',
    markdown: 'MD',
    clock: 'CLK',
    'book-open': 'DOC',
    message: 'MSG'
  }
  return map[icon] || map[code] || icon || 'APP'
}

function normalizeCategoryIcon(icon: string, code: string) {
  const map: Record<string, string> = {
    all: '首',
    nav: '航',
    tool: '工',
    ai: '智',
    study: '学',
    checkin: '签',
    'icon-home': '首',
    'icon-menu': '航',
    'icon-goods': '工',
    'icon-app': '智',
    'icon-log': '学'
  }
  return map[icon] || map[code] || '•'
}
