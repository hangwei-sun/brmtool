<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import type { ToolboxTool } from '../../services/toolbox'

const props = defineProps<{
  tool: ToolboxTool
}>()

const emit = defineEmits<{
  close: []
}>()

const webviewRef = ref<any>(null)
const frameRef = ref<HTMLElement | null>(null)
const webviewStyle = ref({
  width: '100%',
  height: '100%'
})
const currentUrl = ref(normalizeUrl(props.tool.entry))
const address = ref(currentUrl.value)
const isLoading = ref(true)
const canGoBack = ref(false)
const error = ref('')

const title = computed(() => props.tool.name || '内部浏览')
const cleanupListeners: Array<() => void> = []
let resizeObserver: ResizeObserver | null = null
let resizeFrame = 0

function normalizeUrl(value: string) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'about:blank'
    }
    return url.toString()
  } catch {
    return 'about:blank'
  }
}

function bindWebview() {
  const view = webviewRef.value
  if (!view) return

  addWebviewListener(view, 'dom-ready', () => {
    syncWebviewSize()
    updateState()
  })
  addWebviewListener(view, 'did-start-loading', () => {
    isLoading.value = true
    error.value = ''
  })
  addWebviewListener(view, 'did-stop-loading', () => {
    isLoading.value = false
    syncWebviewSize()
    updateState()
  })
  addWebviewListener(view, 'did-navigate', updateState)
  addWebviewListener(view, 'did-navigate-in-page', updateState)
  addWebviewListener(view, 'did-fail-load', (event: any) => {
    if (event.errorCode !== -3 && event.isMainFrame !== false) {
      error.value = event.errorDescription || '页面加载失败'
    }
  })
}

function bindResizeObserver() {
  const frame = frameRef.value
  if (!frame) return

  resizeObserver = new ResizeObserver(syncWebviewSize)
  resizeObserver.observe(frame)
  window.addEventListener('resize', syncWebviewSize)
  cleanupListeners.push(() => window.removeEventListener('resize', syncWebviewSize))
  syncWebviewSize()
}

function syncWebviewSize() {
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
  }

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0
    const frame = frameRef.value
    const view = webviewRef.value as HTMLElement | null
    if (!frame) return

    const rect = frame.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))

    webviewStyle.value = {
      width: `${width}px`,
      height: `${height}px`
    }

    if (view) {
      view.style.width = `${width}px`
      view.style.height = `${height}px`
    }
  })
}

void nextTick(() => {
  bindWebview()
  bindResizeObserver()
})

onBeforeUnmount(() => {
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
  }
  resizeObserver?.disconnect()
  cleanupListeners.splice(0).forEach((cleanup) => cleanup())
})

function addWebviewListener(view: any, eventName: string, handler: (...args: any[]) => void) {
  view.addEventListener(eventName, handler)
  cleanupListeners.push(() => view.removeEventListener(eventName, handler))
}

function updateState() {
  const view = webviewRef.value
  if (!view) return
  try {
    currentUrl.value = view.getURL()
    address.value = currentUrl.value
    canGoBack.value = view.canGoBack()
  } catch {}
}

function navigate() {
  const nextUrl = normalizeUrl(address.value)
  if (nextUrl === 'about:blank') {
    error.value = '只支持打开 http/https 地址'
    return
  }
  currentUrl.value = nextUrl
}

function goBack() {
  const view = webviewRef.value
  if (view?.canGoBack()) {
    view.goBack()
  }
}

function reload() {
  webviewRef.value?.reload()
}

function goHome() {
  currentUrl.value = normalizeUrl(props.tool.entry)
  address.value = currentUrl.value
}
</script>

<template>
  <section class="web-runner">
    <header class="web-toolbar">
      <div class="web-title">
        <span>{{ tool.icon }}</span>
        <strong>{{ title }}</strong>
      </div>
      <button type="button" :disabled="!canGoBack" @click="goBack">返回</button>
      <button type="button" @click="reload">刷新</button>
      <button type="button" @click="goHome">返回首页</button>
      <form class="address-bar" @submit.prevent="navigate">
        <input v-model="address" type="url" spellcheck="false" />
      </form>
      <button type="button" class="close-btn" @click="emit('close')">关闭</button>
    </header>

    <p v-if="error" class="web-error">{{ error }}</p>
    <div ref="frameRef" class="web-frame" :class="{ loading: isLoading }">
      <webview
        ref="webviewRef"
        :src="currentUrl"
        :style="webviewStyle"
        partition="persist:brmtool-browser"
        webpreferences="contextIsolation=yes, nodeIntegration=no, sandbox=yes"
      />
    </div>
  </section>
</template>

<style scoped>
.web-runner {
  position: absolute;
  inset: 0;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.web-toolbar {
  min-height: 52px;
  display: grid;
  grid-template-columns: minmax(150px, 0.32fr) repeat(3, auto) minmax(260px, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgba(44, 164, 244, 0.42);
  border-radius: 8px;
  background: rgba(5, 24, 50, 0.86);
}

.web-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  color: #f1f8ff;
}

.web-title span {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(53, 218, 255, 0.5);
  border-radius: 8px;
  color: #61efff;
  font-size: 12px;
  font-weight: 800;
}

.web-title strong {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.web-toolbar button {
  height: 34px;
  border: 1px solid rgba(91, 172, 235, 0.32);
  border-radius: 8px;
  padding: 0 10px;
  background: rgba(6, 29, 61, 0.72);
  color: #cde9ff;
  cursor: pointer;
}

.web-toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.web-toolbar .close-btn {
  color: #ffb8b8;
}

.address-bar input {
  width: 100%;
  height: 34px;
  border: 1px solid rgba(91, 172, 235, 0.28);
  border-radius: 8px;
  outline: 0;
  padding: 0 12px;
  background: rgba(4, 19, 42, 0.82);
  color: #f0fbff;
}

.web-error {
  position: absolute;
  z-index: 2;
  top: 64px;
  left: 12px;
  right: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 92, 92, 0.38);
  border-radius: 8px;
  background: rgba(92, 20, 30, 0.24);
  color: #ffb8b8;
  font-size: 13px;
}

.web-frame {
  position: relative;
  height: auto;
  min-height: 0;
  display: block;
  overflow: hidden;
  border: 1px solid rgba(44, 164, 244, 0.36);
  border-radius: 8px;
  background: rgba(5, 23, 49, 0.74);
}

.web-frame.loading {
  box-shadow: inset 0 0 28px rgba(0, 136, 255, 0.12);
}

webview {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: inline-flex;
}

@media (max-width: 980px) {
  .web-toolbar {
    grid-template-columns: 1fr repeat(4, auto);
  }

  .address-bar {
    grid-column: 1 / -1;
  }
}
</style>
