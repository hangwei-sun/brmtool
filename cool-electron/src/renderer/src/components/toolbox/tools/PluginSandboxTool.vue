<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ToolboxTool } from '../../../services/toolbox'

const props = defineProps<{
  tool: ToolboxTool
}>()

const emit = defineEmits<{
  close: []
}>()

const DEFAULT_PLUGIN_ORIGIN = 'https://tool.baotounews.cn'
const webviewRef = ref<any>(null)
const isLoading = ref(true)
const error = ref('')
const permissionAccepted = ref(false)
const cleanupListeners: Array<() => void> = []

const plugin = computed(() => props.tool.config?.plugin || {})
const pluginCode = computed(() => String(plugin.value.code || props.tool.entry.replace(/^plugin:/, '')))
const pluginUrl = computed(() => normalizePluginEntry(String(plugin.value.entry || '')))
const title = computed(() => plugin.value.name || props.tool.name || '沙箱插件')
const permissionKey = computed(
  () => `brmtool-plugin-permission:${pluginCode.value}:${plugin.value.version || props.tool.version || '0'}`
)
const permissions = computed(() =>
  Array.isArray(plugin.value.permissions) ? plugin.value.permissions.map(String) : []
)
const permissionLabels: Record<string, string> = {
  'network:app-api': '访问工具箱 App API',
  'storage:plugin': '使用插件私有存储',
  'notification:readonly': '读取通知状态'
}

function normalizePluginEntry(value: string) {
  if (!value) {
    return 'about:blank'
  }

  try {
    const url = value.startsWith('/plugins/')
      ? new URL(value, DEFAULT_PLUGIN_ORIGIN)
      : new URL(value)

    if (url.protocol !== 'https:') {
      return 'about:blank'
    }

    url.searchParams.set('brmtoolPlugin', pluginCode.value)
    return url.toString()
  } catch {
    return 'about:blank'
  }
}

function reload() {
  webviewRef.value?.reload()
}

function restorePermission() {
  permissionAccepted.value = window.localStorage.getItem(permissionKey.value) === '1'
}

function acceptPermissions() {
  window.localStorage.setItem(permissionKey.value, '1')
  permissionAccepted.value = true
}

function bindWebview(view: any) {
  if (!view) return

  cleanupListeners.splice(0).forEach((cleanup) => cleanup())

  const onStart = () => {
    isLoading.value = true
    error.value = ''
  }
  const onStop = () => {
    isLoading.value = false
  }
  const onFail = (event: any) => {
    if (event.errorCode !== -3 && event.isMainFrame !== false) {
      error.value = event.errorDescription || '插件加载失败'
    }
  }

  view.addEventListener('did-start-loading', onStart)
  view.addEventListener('did-stop-loading', onStop)
  view.addEventListener('did-fail-load', onFail)
  cleanupListeners.push(() => view.removeEventListener('did-start-loading', onStart))
  cleanupListeners.push(() => view.removeEventListener('did-stop-loading', onStop))
  cleanupListeners.push(() => view.removeEventListener('did-fail-load', onFail))
}

watch(
  () => webviewRef.value,
  (view) => bindWebview(view)
)

watch(
  () => permissionKey.value,
  () => restorePermission(),
  { immediate: true }
)

void nextTick(() => bindWebview(webviewRef.value))

onBeforeUnmount(() => {
  cleanupListeners.splice(0).forEach((cleanup) => cleanup())
})
</script>

<template>
  <section class="plugin-runner">
    <header class="plugin-toolbar">
      <div class="plugin-title">
        <span>{{ tool.icon || 'PLG' }}</span>
        <div>
          <strong>{{ title }}</strong>
          <small>Web 沙箱 · {{ plugin.version || tool.version || '未标注版本' }}</small>
        </div>
      </div>
      <button type="button" @click="reload">刷新</button>
      <button type="button" class="close-btn" @click="emit('close')">关闭</button>
    </header>

    <div v-if="!permissionAccepted" class="plugin-permission">
      <div class="permission-card">
        <span class="permission-icon">{{ tool.icon || 'PLG' }}</span>
        <h3>{{ title }}</h3>
        <p>第三方插件将在隔离 Web 沙箱中运行，仅能使用以下白名单能力。</p>
        <ul>
          <li v-if="permissions.length === 0">无额外能力</li>
          <li v-for="item in permissions" :key="item">
            {{ permissionLabels[item] || item }}
          </li>
        </ul>
        <div class="permission-actions">
          <button type="button" @click="emit('close')">取消</button>
          <button type="button" class="primary" @click="acceptPermissions">同意并运行</button>
        </div>
      </div>
    </div>

    <p v-else-if="pluginUrl === 'about:blank'" class="plugin-error">
      插件入口未配置为可信 HTTPS 或 /plugins/ 相对路径。
    </p>
    <p v-else-if="error" class="plugin-error">{{ error }}</p>

    <div v-if="permissionAccepted" class="plugin-frame" :class="{ loading: isLoading }">
      <webview
        v-if="pluginUrl !== 'about:blank'"
        ref="webviewRef"
        :src="pluginUrl"
        :partition="`persist:brmtool-plugin-${pluginCode}`"
        webpreferences="contextIsolation=yes, nodeIntegration=no, sandbox=yes"
      />
    </div>
  </section>
</template>

<style scoped>
.plugin-runner {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.plugin-toolbar {
  min-height: 54px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid rgba(44, 164, 244, 0.42);
  border-radius: 8px;
  background: rgba(5, 24, 50, 0.86);
}

.plugin-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f1f8ff;
}

.plugin-title span {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(53, 218, 255, 0.5);
  border-radius: 8px;
  color: #61efff;
  font-size: 12px;
  font-weight: 800;
}

.plugin-title strong,
.plugin-title small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-title small {
  margin-top: 2px;
  color: #8fa7cc;
  font-size: 12px;
}

.plugin-toolbar button {
  height: 34px;
  border: 1px solid rgba(91, 172, 235, 0.32);
  border-radius: 8px;
  padding: 0 12px;
  background: rgba(6, 29, 61, 0.72);
  color: #cde9ff;
  cursor: pointer;
}

.plugin-toolbar .close-btn {
  color: #ffb8b8;
}

.plugin-error {
  position: absolute;
  z-index: 2;
  top: 74px;
  left: 12px;
  right: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 92, 92, 0.38);
  border-radius: 8px;
  background: rgba(92, 20, 30, 0.78);
  color: #ffdddd;
}

.plugin-permission {
  min-height: 0;
  display: grid;
  place-items: center;
  border: 1px solid rgba(44, 164, 244, 0.36);
  border-radius: 8px;
  background:
    radial-gradient(circle at 50% 15%, rgba(22, 134, 215, 0.18), transparent 34%),
    rgba(3, 16, 34, 0.72);
}

.permission-card {
  width: min(460px, calc(100% - 32px));
  padding: 28px;
  border: 1px solid rgba(62, 202, 255, 0.36);
  border-radius: 8px;
  background: rgba(5, 24, 50, 0.92);
  color: #dcedff;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.26);
}

.permission-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(53, 218, 255, 0.55);
  border-radius: 8px;
  color: #61efff;
  font-size: 16px;
  font-weight: 800;
}

.permission-card h3 {
  margin: 16px 0 8px;
  font-size: 22px;
}

.permission-card p,
.permission-card li {
  color: #9db6d8;
  line-height: 1.7;
}

.permission-card ul {
  margin: 16px 0 0;
  padding-left: 18px;
}

.permission-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.permission-actions .primary {
  border-color: rgba(39, 220, 255, 0.62);
  background: rgba(15, 117, 198, 0.56);
  color: #eaf9ff;
}

.plugin-frame {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(44, 164, 244, 0.36);
  border-radius: 8px;
  background: rgba(3, 16, 34, 0.72);
}

.plugin-frame.loading::after {
  content: '插件加载中...';
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #70dfff;
  pointer-events: none;
}

webview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
