<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { darkTheme, NConfigProvider, NButton, NInput } from 'naive-ui'

// 与 src/preload/index.d.ts 中保持一致的类型定义
interface SystemInfo {
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

interface PushMessage {
  id: number
  time: string
  message: string
  memFree: string
  load: string
}

interface FileReadResult {
  success: boolean
  content?: string
  truncated?: boolean
  sizeLabel?: string
  error?: string
}

interface NotificationResult {
  success: boolean
  error?: string
}

interface FetchResult {
  success: boolean
  status?: number
  statusText?: string
  elapsed?: number
  data?: unknown
  error?: string
}

// Naive UI 主题颜色覆盖，将 primary 颜色设为电光青色
const themeOverrides = {
  common: {
    primaryColor: '#22d3ee',
    primaryColorHover: '#06b6d4',
    primaryColorPressed: '#0891b2',
    primaryColorSuppl: '#22d3ee',
    // 覆盖 Naive UI 默认字体栈，避免触发 macOS 私有 CJK 字体警告
    fontFamily: '"Outfit", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
  }
}

// ── 版本信息（从 Electron 进程直接读取）────────────────────────────────
const appVersions = ref({ electron: '', node: '', chrome: '' })
onMounted(() => {
  const v = window.electron.process.versions
  appVersions.value = {
    electron: v.electron ?? '',
    node: v.node ?? '',
    chrome: v.chrome ?? ''
  }
})

// ── 通信日志 ──────────────────────────────────────────────────────────
interface LogEntry {
  id: number
  time: string
  direction: 'R→M' | 'M→R'
  channel: string
  summary: string
}

let nextLogId = 0
const logs = ref<LogEntry[]>([])

function addLog(dir: LogEntry['direction'], channel: string, summary: string) {
  logs.value.unshift({
    id: ++nextLogId,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    direction: dir,
    channel,
    summary
  })
  if (logs.value.length > 100) logs.value.length = 100
}

// ── 模式一：请求响应 ─────────────────────────────────────────────────
const loading = ref(false)
const sysInfo = ref<SystemInfo | null>(null)

const basicInfoRows = computed(() =>
  sysInfo.value
    ? [
        ['平台', sysInfo.value.platform],
        ['架构', sysInfo.value.arch],
        ['主机名', sysInfo.value.hostname],
        ['CPU 核心', String(sysInfo.value.cpus)],
        ['总内存', sysInfo.value.totalMem],
        ['可用内存', sysInfo.value.freeMem]
      ]
    : []
)
const versionRows = computed(() => (sysInfo.value ? Object.entries(sysInfo.value.versions) : []))

async function fetchSysInfo() {
  if (loading.value) return
  loading.value = true
  addLog('R→M', 'ipc:get-system-info', '发起系统信息请求...')
  try {
    const info = await window.api.getSystemInfo()
    sysInfo.value = info
    addLog('M→R', 'ipc:get-system-info', `返回 platform=${info.platform} arch=${info.arch}`)
  } finally {
    loading.value = false
  }
}

// ── 模式二：主动推送 ─────────────────────────────────────────────────
const pushing = ref(false)
const messages = ref<PushMessage[]>([])

function startPush() {
  if (pushing.value) return
  pushing.value = true
  messages.value = []
  window.api.startPush()
  addLog('R→M', 'ipc:push-start', '请求 Main 开始推送')
  window.api.onPushMessage((data) => {
    messages.value.unshift(data)
    if (messages.value.length > 12) messages.value.pop()
    addLog('M→R', 'ipc:push-message', `#${data.id} | mem=${data.memFree} load=${data.load}`)
  })
}

function stopPush() {
  if (!pushing.value) return
  window.api.stopPush()
  window.api.offPushMessage()
  pushing.value = false
  addLog('R→M', 'ipc:push-stop', '请求 Main 停止推送')
}

// ── 文件系统 ─────────────────────────────────────────────────────────
const fileLoading = ref(false)
const filePath = ref<string | null>(null)
const fileResult = ref<FileReadResult | null>(null)

async function openFile() {
  fileLoading.value = true
  addLog('R→M', 'file:open-dialog', '打开文件选择对话框')
  try {
    const path = await window.api.openFileDialog()
    if (!path) {
      addLog('M→R', 'file:open-dialog', '用户取消选择')
      return
    }
    filePath.value = path
    addLog('M→R', 'file:open-dialog', `已选中：${path.split('/').pop()}`)
    addLog('R→M', 'file:read', `读取文件：${path.split('/').pop()}`)
    const result = await window.api.readFile(path)
    fileResult.value = result
    if (result.success) {
      addLog(
        'M→R',
        'file:read',
        `读取成功 ${result.sizeLabel}${result.truncated ? '（已截断）' : ''}`
      )
    } else {
      addLog('M→R', 'file:read', `读取失败：${result.error}`)
    }
  } finally {
    fileLoading.value = false
  }
}

// ── 系统通知 ─────────────────────────────────────────────────────────
const notifTitle = ref('来自 cool-electron 的通知')
const notifBody = ref('这是一条 Electron 桌面通知，由 Main 进程发送。')
const notifLoading = ref(false)
const notifResult = ref<NotificationResult | null>(null)

async function sendNotification() {
  if (notifLoading.value) return
  notifLoading.value = true
  notifResult.value = null
  addLog('R→M', 'notification:send', `title="${notifTitle.value}"`)
  try {
    const result = await window.api.sendNotification(notifTitle.value, notifBody.value)
    notifResult.value = result
    addLog('M→R', 'notification:send', result.success ? '通知已发送' : `失败：${result.error}`)
  } finally {
    notifLoading.value = false
  }
}

// ── HTTP 请求 ─────────────────────────────────────────────────────────
const PRESETS = [
  { label: 'JSONPlaceholder', url: 'https://jsonplaceholder.typicode.com/todos/1' },
  { label: 'GitHub Electron', url: 'https://api.github.com/repos/electron/electron' },
  { label: 'IP 信息', url: 'https://ipapi.co/json/' }
]

const reqUrl = ref(PRESETS[0].url)
const reqLoading = ref(false)
const fetchResult = ref<FetchResult | null>(null)

const statusColor = computed(() => {
  const s = fetchResult.value?.status ?? 0
  if (s >= 200 && s < 300) return 'ok'
  if (s >= 400) return 'fail'
  return 'warn'
})

const prettyJson = computed(() => {
  if (!fetchResult.value?.data) return ''
  try {
    return JSON.stringify(fetchResult.value.data, null, 2)
  } catch {
    return String(fetchResult.value.data)
  }
})

async function sendRequest() {
  if (reqLoading.value || !reqUrl.value) return
  reqLoading.value = true
  fetchResult.value = null
  addLog('R→M', 'request:fetch', `GET ${reqUrl.value}`)
  try {
    const result = await window.api.fetchUrl(reqUrl.value)
    fetchResult.value = result
    if (result.success) {
      addLog('M→R', 'request:fetch', `${result.status} ${result.statusText} · ${result.elapsed}ms`)
    } else {
      addLog('M→R', 'request:fetch', `失败：${result.error}`)
    }
  } finally {
    reqLoading.value = false
  }
}

onUnmounted(() => {
  if (pushing.value) {
    window.api.stopPush()
    window.api.offPushMessage()
  }
})
</script>

<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <div class="shell">
      <!-- ── 顶部导航栏 ───────────────────────────────────────────── -->
      <header class="hd">
        <div class="hd-brand">
          <svg class="hd-hex" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L21.196 7V17L12 22L2.804 17V7L12 2Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path
              d="M12 7L16.598 9.5V14.5L12 17L7.402 14.5V9.5L12 7Z"
              stroke="currentColor"
              stroke-width="1"
              stroke-linejoin="round"
              opacity="0.4"
            />
          </svg>
          <div>
            <span class="hd-name">cool-electron</span>
            <span class="hd-sub">electron-vite · Vue3 · TypeScript · Naive UI</span>
          </div>
        </div>

        <!-- 版本信息 -->
        <div class="hd-versions">
          <div v-if="appVersions.electron" class="ver-group">
            <span class="ver-chip electron">Electron {{ appVersions.electron }}</span>
            <span class="ver-chip node">Node {{ appVersions.node }}</span>
            <span class="ver-chip chrome">Chrome {{ appVersions.chrome }}</span>
          </div>
          <div v-else class="ver-loading">加载版本...</div>
        </div>

        <!-- 架构流向 -->
        <div class="hd-arch">
          <span class="arch-badge renderer">Renderer</span>
          <span class="arch-sep">⇄</span>
          <span class="arch-badge preload">Preload</span>
          <span class="arch-sep">⇄</span>
          <span class="arch-badge main">Main</span>
        </div>
      </header>

      <div class="content-scroll">
        <div class="page">
          <!-- ── 2×2 卡片网格 ──────────────────────────────────────────── -->
          <div class="cards-grid">
            <!-- 卡片一：IPC 请求响应 -->
            <div class="card">
              <div class="card-hd cyan-hd">
                <div class="card-hd-row">
                  <span class="mode-pill cyan-pill">R → M</span>
                  <span class="card-title">IPC 请求 / 响应</span>
                </div>
                <code class="card-api">ipcRenderer.invoke &nbsp;↔&nbsp; ipcMain.handle</code>
              </div>
              <div class="card-body">
                <n-button
                  type="primary"
                  size="small"
                  :loading="loading"
                  :disabled="loading"
                  @click="fetchSysInfo"
                >
                  {{ loading ? '请求中...' : '⚡ 获取系统信息' }}
                </n-button>

                <transition name="fade-up" mode="out-in">
                  <div v-if="sysInfo" key="info" class="info-panel">
                    <div class="info-grid">
                      <div v-for="[k, v] in basicInfoRows" :key="k" class="info-cell">
                        <span class="ik">{{ k }}</span>
                        <span class="iv">{{ v }}</span>
                      </div>
                    </div>
                    <div class="info-sep">版本信息</div>
                    <div class="info-grid">
                      <div v-for="[k, v] in versionRows" :key="k" class="info-cell">
                        <span class="ik">{{ k }}</span>
                        <span class="iv purple">{{ v }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-else key="empty" class="placeholder">
                    <span class="ph-icon">◈</span>
                    <span class="ph-text">点击按钮向 Main 进程发起 IPC 请求</span>
                  </div>
                </transition>
              </div>
            </div>

            <!-- 卡片二：IPC 主动推送 -->
            <div class="card">
              <div class="card-hd amber-hd">
                <div class="card-hd-row">
                  <span class="mode-pill amber-pill">M → R</span>
                  <span class="card-title">IPC 主动推送</span>
                </div>
                <code class="card-api">ipcMain.on &nbsp;+&nbsp; webContents.send</code>
              </div>
              <div class="card-body">
                <div class="push-ctrl">
                  <n-button type="primary" size="small" :disabled="pushing" @click="startPush">
                    ▶ 开始推送
                  </n-button>
                  <n-button type="error" size="small" :disabled="!pushing" @click="stopPush">
                    ■ 停止推送
                  </n-button>
                  <div class="live-badge" :class="{ on: pushing }">
                    <span class="live-dot"></span>
                    {{ pushing ? 'LIVE' : 'IDLE' }}
                  </div>
                </div>

                <div class="feed">
                  <TransitionGroup name="msg-slide">
                    <div v-for="m in messages" :key="m.id" class="feed-row">
                      <span class="f-id">#{{ String(m.id).padStart(3, '0') }}</span>
                      <span class="f-time">{{ m.time.slice(11, 19) }}</span>
                      <span class="f-text">{{ m.message }}</span>
                      <span class="f-stat">MEM {{ m.memFree }}</span>
                      <span class="f-stat">LOAD {{ m.load }}</span>
                    </div>
                  </TransitionGroup>
                  <div v-if="messages.length === 0" class="placeholder feed-ph">
                    <span class="ph-icon">◉</span>
                    <span class="ph-text">等待 Main 进程推送消息...</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 卡片三：文件系统 -->
            <div class="card">
              <div class="card-hd green-hd">
                <div class="card-hd-row">
                  <span class="mode-pill green-pill">R → M</span>
                  <span class="card-title">文件系统</span>
                </div>
                <code class="card-api">dialog.showOpenDialog &nbsp;+&nbsp; fs.readFileSync</code>
              </div>
              <div class="card-body">
                <n-button
                  type="primary"
                  size="small"
                  :loading="fileLoading"
                  :disabled="fileLoading"
                  @click="openFile"
                >
                  📂 选择文件
                </n-button>

                <transition name="fade-up" mode="out-in">
                  <div v-if="fileResult" key="file" class="file-panel">
                    <div class="file-meta">
                      <span class="file-name">{{ filePath?.split('/').pop() }}</span>
                      <span class="file-size">{{ fileResult.sizeLabel }}</span>
                      <span v-if="fileResult.truncated" class="file-trunc">已截断</span>
                    </div>
                    <div v-if="fileResult.success" class="file-preview">
                      <pre class="file-content">{{ fileResult.content }}</pre>
                    </div>
                    <div v-else class="file-error">
                      <span class="err-icon">✕</span>{{ fileResult.error }}
                    </div>
                  </div>
                  <div v-else key="empty-file" class="placeholder">
                    <span class="ph-icon">◫</span>
                    <span class="ph-text">点击选择本地文件，读取并展示内容</span>
                  </div>
                </transition>
              </div>
            </div>

            <!-- 卡片四：系统通知 -->
            <div class="card">
              <div class="card-hd purple-hd">
                <div class="card-hd-row">
                  <span class="mode-pill purple-pill">R → M</span>
                  <span class="card-title">系统通知</span>
                </div>
                <code class="card-api"
                  >new Notification&#40;{ title, body }&#41;.show&#40;&#41;</code
                >
              </div>
              <div class="card-body">
                <div class="notif-form">
                  <div class="form-row">
                    <span class="form-label">标题</span>
                    <n-input
                      v-model:value="notifTitle"
                      size="small"
                      placeholder="通知标题"
                      class="notif-input"
                    />
                  </div>
                  <div class="form-row">
                    <span class="form-label">内容</span>
                    <n-input
                      v-model:value="notifBody"
                      size="small"
                      placeholder="通知内容"
                      class="notif-input"
                    />
                  </div>
                </div>

                <n-button
                  type="primary"
                  size="small"
                  :loading="notifLoading"
                  :disabled="notifLoading || !notifTitle"
                  @click="sendNotification"
                >
                  🔔 发送通知
                </n-button>

                <transition name="fade-up">
                  <div
                    v-if="notifResult"
                    class="notif-result"
                    :class="notifResult.success ? 'ok' : 'fail'"
                  >
                    <span class="result-icon">{{ notifResult.success ? '✓' : '✕' }}</span>
                    <span>{{
                      notifResult.success ? '通知已发送至系统托盘' : notifResult.error
                    }}</span>
                  </div>
                </transition>
              </div>
            </div>

            <!-- 卡片五：API 请求（全宽跨两列） -->
            <div class="card card-full">
              <div class="card-hd teal-hd">
                <div class="card-hd-row">
                  <span class="mode-pill teal-pill">R → M</span>
                  <span class="card-title">外部 API 请求</span>
                </div>
                <code class="card-api">Main 进程 fetch &nbsp;·&nbsp; 绕过浏览器 CORS 限制</code>
              </div>
              <div class="card-body req-body">
                <!-- 预设地址 + 输入框 + 发送 -->
                <div class="req-bar">
                  <div class="req-presets">
                    <button
                      v-for="p in PRESETS"
                      :key="p.label"
                      class="preset-btn"
                      :class="{ active: reqUrl === p.url }"
                      @click="reqUrl = p.url"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                  <div class="req-input-row">
                    <n-input
                      v-model:value="reqUrl"
                      size="small"
                      placeholder="https://..."
                      class="req-input"
                    />
                    <n-button
                      type="primary"
                      size="small"
                      :loading="reqLoading"
                      :disabled="reqLoading || !reqUrl"
                      class="req-send"
                      @click="sendRequest"
                    >
                      发送
                    </n-button>
                  </div>
                </div>

                <!-- 响应结果 -->
                <transition name="fade-up">
                  <div v-if="fetchResult" class="req-result">
                    <div class="req-meta">
                      <span v-if="fetchResult.success" class="status-badge" :class="statusColor">
                        {{ fetchResult.status }} {{ fetchResult.statusText }}
                      </span>
                      <span v-else class="status-badge fail">ERROR</span>
                      <span v-if="fetchResult.elapsed" class="req-elapsed"
                        >{{ fetchResult.elapsed }} ms</span
                      >
                      <span class="req-url-tag">{{ reqUrl }}</span>
                    </div>
                    <div v-if="fetchResult.success" class="resp-preview">
                      <pre class="resp-code">{{ prettyJson }}</pre>
                    </div>
                    <div v-else class="file-error">
                      <span class="err-icon">✕</span>{{ fetchResult.error }}
                    </div>
                  </div>
                  <div v-else key="empty-req" class="placeholder req-ph">
                    <span class="ph-icon">⬡</span>
                    <span class="ph-text">选择预设地址或输入 URL，点击发送发起请求</span>
                  </div>
                </transition>
              </div>
            </div>
          </div>

          <!-- ── 通信日志面板 ─────────────────────────────────────────── -->
          <div class="log-panel">
            <div class="log-hd">
              <span class="log-label">COMMUNICATION LOG</span>
              <span class="log-count">{{ logs.length }} events</span>
              <button class="clr-btn" @click="logs = []">清空</button>
            </div>
            <div class="log-body">
              <TransitionGroup name="log-slide">
                <div v-for="e in logs" :key="e.id" class="log-row">
                  <span class="l-time">{{ e.time }}</span>
                  <span class="l-dir" :class="e.direction === 'R→M' ? 'r2m' : 'm2r'">
                    {{ e.direction }}
                  </span>
                  <span class="l-ch">{{ e.channel }}</span>
                  <span class="l-summary">{{ e.summary }}</span>
                </div>
              </TransitionGroup>
              <div v-if="logs.length === 0" class="log-empty">等待通信事件...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </n-config-provider>
</template>

<style scoped>
/* ── CSS 变量 ──────────────────────────────────────────────────────── */
.shell {
  --cyan: #22d3ee;
  --cyan-dim: rgba(34, 211, 238, 0.12);
  --cyan-border: rgba(34, 211, 238, 0.25);
  --amber: #f59e0b;
  --amber-dim: rgba(245, 158, 11, 0.1);
  --amber-border: rgba(245, 158, 11, 0.25);
  --green: #10b981;
  --green-dim: rgba(16, 185, 129, 0.1);
  --green-border: rgba(16, 185, 129, 0.25);
  --purple: #a78bfa;
  --purple-dim: rgba(167, 139, 250, 0.1);
  --purple-border: rgba(167, 139, 250, 0.25);
  --red: #ef4444;
  --bg: #080810;
  --card-bg: rgba(12, 12, 24, 0.98);
  --border: rgba(255, 255, 255, 0.06);
  --text: #e2e8f0;
  --text-2: #94a3b8;
  --text-3: #475569;
  --mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
  /* 不使用 -apple-system / BlinkMacSystemFont，避免触发 macOS 私有 CJK 字体警告 */
  --ui: 'Outfit', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

  font-family: var(--ui);
  color: var(--text);
  width: 100%;
  height: 100dvh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(ellipse 70% 50% at 10% 0%, rgba(34, 211, 238, 0.07) 0%, transparent 100%),
    radial-gradient(ellipse 60% 50% at 90% 100%, rgba(167, 139, 250, 0.06) 0%, transparent 100%),
    #080810;
}

.content-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.content-scroll::-webkit-scrollbar {
  width: 5px;
}
.content-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.content-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
}
.content-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.22);
}

.page {
  display: flex;
  flex-direction: column;
}

/* ── Header ────────────────────────────────────────────────────────── */
.hd {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: rgba(8, 8, 16, 0.7);
  backdrop-filter: blur(20px);
}

.hd-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.hd-hex {
  width: 24px;
  height: 24px;
  color: var(--cyan);
  filter: drop-shadow(0 0 7px rgba(34, 211, 238, 0.55));
  flex-shrink: 0;
}

.hd-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: var(--text);
  line-height: 1.2;
}

.hd-sub {
  display: block;
  font-size: 9.5px;
  color: var(--text-3);
  font-family: var(--mono);
  letter-spacing: 0.2px;
  margin-top: 1px;
}

/* 版本信息 */
.hd-versions {
  flex: 1;
  display: flex;
  align-items: center;
}

.ver-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ver-chip {
  font-size: 9.5px;
  font-family: var(--mono);
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 100px;
  letter-spacing: 0.2px;
}

.ver-chip.electron {
  background: var(--cyan-dim);
  border: 1px solid var(--cyan-border);
  color: var(--cyan);
}

.ver-chip.node {
  background: var(--green-dim);
  border: 1px solid var(--green-border);
  color: var(--green);
}

.ver-chip.chrome {
  background: var(--amber-dim);
  border: 1px solid var(--amber-border);
  color: var(--amber);
}

.ver-loading {
  font-size: 9.5px;
  font-family: var(--mono);
  color: var(--text-3);
}

.hd-arch {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.arch-sep {
  color: var(--text-3);
  font-size: 12px;
}

.arch-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 9px;
  border-radius: 100px;
  font-family: var(--mono);
  letter-spacing: 0.3px;
}

.arch-badge.renderer {
  background: var(--cyan-dim);
  border: 1px solid var(--cyan-border);
  color: var(--cyan);
}

.arch-badge.preload {
  background: var(--purple-dim);
  border: 1px solid var(--purple-border);
  color: var(--purple);
}

.arch-badge.main {
  background: var(--amber-dim);
  border: 1px solid var(--amber-border);
  color: var(--amber);
}

/* ── Cards Grid ─────────────────────────────────────────────────────── */
.cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 10px 14px 0;
  flex-shrink: 0;
}

/* ── Card ───────────────────────────────────────────────────────────── */
.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 9px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s ease;
}

.card:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.card-hd {
  padding: 9px 13px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.cyan-hd {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.05) 0%, transparent 100%);
}
.amber-hd {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%);
}
.green-hd {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
}
.purple-hd {
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.05) 0%, transparent 100%);
}

.card-hd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.mode-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 100px;
  font-family: var(--mono);
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.cyan-pill {
  background: var(--cyan-dim);
  border: 1px solid var(--cyan-border);
  color: var(--cyan);
}
.amber-pill {
  background: var(--amber-dim);
  border: 1px solid var(--amber-border);
  color: var(--amber);
}
.green-pill {
  background: var(--green-dim);
  border: 1px solid var(--green-border);
  color: var(--green);
}
.purple-pill {
  background: var(--purple-dim);
  border: 1px solid var(--purple-border);
  color: var(--purple);
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.card-api {
  font-family: var(--mono);
  font-size: 9.5px;
  color: var(--text-3);
  letter-spacing: 0.1px;
}

.card-body {
  padding: 10px 13px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  height: 200px;
  overflow-y: auto;
}

.card-body::-webkit-scrollbar {
  width: 3px;
}
.card-body::-webkit-scrollbar-track {
  background: transparent;
}
.card-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

/* ── Info Panel ─────────────────────────────────────────────────────── */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 8px;
}

.info-cell {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 2px 0;
}

.ik {
  font-size: 9.5px;
  color: var(--text-3);
  min-width: 54px;
  flex-shrink: 0;
  font-family: var(--mono);
}

.iv {
  font-size: 11px;
  color: var(--cyan);
  font-family: var(--mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.iv.purple {
  color: var(--purple);
  font-size: 10px;
}

.info-sep {
  font-size: 9px;
  color: var(--text-3);
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  padding: 4px 0 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

/* ── Placeholder ────────────────────────────────────────────────────── */
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  color: var(--text-3);
}

.feed-ph {
  padding: 8px;
}

.ph-icon {
  font-size: 16px;
  opacity: 0.3;
}

.ph-text {
  font-size: 11px;
  font-family: var(--mono);
  text-align: center;
  line-height: 1.5;
}

/* ── Push Controls ──────────────────────────────────────────────────── */
.push-ctrl {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-family: var(--mono);
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--text-3);
  padding: 3px 9px;
  border-radius: 100px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  transition:
    color 0.3s,
    border-color 0.3s,
    background 0.3s;
}

.live-badge.on {
  color: var(--green);
  border-color: rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.08);
}

.live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.live-badge.on .live-dot {
  animation: dot-pulse 1.4s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(0.6);
  }
}

/* ── Push Feed ──────────────────────────────────────────────────────── */
.feed {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.feed::-webkit-scrollbar {
  width: 3px;
}
.feed::-webkit-scrollbar-track {
  background: transparent;
}
.feed::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
}

.feed-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 7px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.04);
  border: 1px solid rgba(245, 158, 11, 0.09);
  font-family: var(--mono);
}

.f-id {
  font-size: 9px;
  color: var(--text-3);
  min-width: 26px;
}
.f-time {
  font-size: 9px;
  color: var(--text-3);
  min-width: 58px;
}
.f-text {
  flex: 1;
  font-size: 10.5px;
  color: var(--amber);
}
.f-stat {
  font-size: 9px;
  color: var(--text-3);
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.03);
  white-space: nowrap;
}

/* ── File Panel ─────────────────────────────────────────────────────── */
.file-panel {
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
  min-height: 0;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
}

.file-name {
  font-size: 11px;
  color: var(--green);
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 9.5px;
  color: var(--text-3);
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.file-trunc {
  font-size: 9.5px;
  color: var(--amber);
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--amber-dim);
  border: 1px solid var(--amber-border);
  flex-shrink: 0;
}

.file-preview {
  flex: 1;
  overflow-y: auto;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(16, 185, 129, 0.12);
  padding: 7px 9px;
  min-height: 0;
}

.file-preview::-webkit-scrollbar {
  width: 3px;
}
.file-preview::-webkit-scrollbar-track {
  background: transparent;
}
.file-preview::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
}

.file-content {
  font-family: var(--mono);
  font-size: 9.5px;
  color: var(--text-2);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.file-error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-family: var(--mono);
  color: var(--red);
  padding: 8px;
  border-radius: 5px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.err-icon {
  font-weight: 700;
}

/* ── Notification Form ──────────────────────────────────────────────── */
.notif-form {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-label {
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--mono);
  min-width: 28px;
  flex-shrink: 0;
}

.notif-input {
  flex: 1;
}

.notif-result {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-family: var(--mono);
  padding: 6px 10px;
  border-radius: 5px;
}

.notif-result.ok {
  color: var(--green);
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.notif-result.fail {
  color: var(--red);
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.result-icon {
  font-weight: 700;
  font-size: 13px;
}

/* ── 全宽卡片 ───────────────────────────────────────────────────────── */
.card-full {
  grid-column: 1 / -1;
}

.teal-hd {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.05) 0%, transparent 100%);
}

.teal-pill {
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.3);
  color: #2dd4bf;
}

.req-body {
  height: 200px;
  gap: 8px;
}

/* 预设按钮 + 输入行 */
.req-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.req-presets {
  display: flex;
  gap: 5px;
}

.preset-btn {
  font-size: 10px;
  font-family: var(--mono);
  color: var(--text-3);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 5px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-btn:hover {
  color: #2dd4bf;
  border-color: rgba(20, 184, 166, 0.3);
  background: rgba(20, 184, 166, 0.06);
}

.preset-btn.active {
  color: #2dd4bf;
  border-color: rgba(20, 184, 166, 0.4);
  background: rgba(20, 184, 166, 0.1);
}

.req-input-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.req-input {
  flex: 1;
}
.req-send {
  flex-shrink: 0;
}

/* 响应区域 */
.req-result {
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
  min-height: 0;
}

.req-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.status-badge {
  font-size: 10.5px;
  font-family: var(--mono);
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 5px;
}

.status-badge.ok {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: var(--green);
}

.status-badge.fail {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--red);
}

.status-badge.warn {
  background: var(--amber-dim);
  border: 1px solid var(--amber-border);
  color: var(--amber);
}

.req-elapsed {
  font-size: 10px;
  font-family: var(--mono);
  color: var(--text-3);
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
}

.req-url-tag {
  font-size: 10px;
  font-family: var(--mono);
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.resp-preview {
  flex: 1;
  overflow-y: auto;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(20, 184, 166, 0.12);
  padding: 7px 9px;
  min-height: 0;
}

.resp-preview::-webkit-scrollbar {
  width: 3px;
}
.resp-preview::-webkit-scrollbar-track {
  background: transparent;
}
.resp-preview::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
}

.resp-code {
  font-family: var(--mono);
  font-size: 10px;
  color: #2dd4bf;
  line-height: 1.65;
  white-space: pre;
  margin: 0;
}

.req-ph {
  flex: 1;
}

/* ── Log Panel ──────────────────────────────────────────────────────── */
.log-panel {
  height: 220px;
  margin: 10px 14px 10px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: rgba(8, 8, 20, 0.7);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 11px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: rgba(12, 12, 24, 0.8);
}

.log-label {
  flex: 1;
  font-size: 9px;
  font-family: var(--mono);
  font-weight: 600;
  letter-spacing: 1.8px;
  color: var(--text-3);
  text-transform: uppercase;
}

.log-count {
  font-size: 9px;
  font-family: var(--mono);
  color: var(--text-3);
}

.clr-btn {
  font-size: 9px;
  font-family: var(--mono);
  color: var(--text-3);
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  padding: 2px 7px;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.3px;
}

.clr-btn:hover {
  color: var(--red);
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.05);
}

.log-body {
  overflow-y: auto;
  padding: 4px 7px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.log-body::-webkit-scrollbar {
  width: 3px;
}
.log-body::-webkit-scrollbar-track {
  background: transparent;
}
.log-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
}

.log-row {
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 3px 4px;
  border-radius: 3px;
  font-family: var(--mono);
  transition: background 0.1s;
}

.log-row:hover {
  background: rgba(255, 255, 255, 0.025);
}

.l-time {
  font-size: 9px;
  color: var(--text-3);
  min-width: 60px;
  flex-shrink: 0;
}
.l-dir {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}
.l-dir.r2m {
  background: var(--cyan-dim);
  color: var(--cyan);
}
.l-dir.m2r {
  background: var(--amber-dim);
  color: var(--amber);
}
.l-ch {
  font-size: 9.5px;
  color: var(--text-3);
  min-width: 160px;
  flex-shrink: 0;
}
.l-summary {
  font-size: 10px;
  color: var(--text-2);
}

.log-empty {
  font-size: 10.5px;
  font-family: var(--mono);
  color: var(--text-3);
  text-align: center;
  padding: 16px;
}

/* ── Transitions ────────────────────────────────────────────────────── */
.fade-up-enter-active {
  transition: all 0.22s ease-out;
}
.fade-up-leave-active {
  transition: all 0.15s ease-in;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.msg-slide-enter-active {
  transition: all 0.2s ease-out;
}
.msg-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.msg-slide-move {
  transition: transform 0.2s ease;
}

.log-slide-enter-active {
  transition: all 0.15s ease-out;
}
.log-slide-enter-from {
  opacity: 0;
  transform: translateX(-6px);
}
.log-slide-move {
  transition: transform 0.15s ease;
}
</style>
