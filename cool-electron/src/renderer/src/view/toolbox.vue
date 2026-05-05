<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import InternalToolRunner from '../components/toolbox/InternalToolRunner.vue'
import MetricPanel from '../components/toolbox/MetricPanel.vue'
import SidebarNav, { type ToolboxNavItem } from '../components/toolbox/SidebarNav.vue'
import ToolCard from '../components/toolbox/ToolCard.vue'
import logoUrl from '../assets/electron.svg'
import bannerUrl from '../assets/toolbox-banner.svg'
import {
  defaultHome,
  fetchToolboxHome,
  fetchToolboxTools,
  isTruthy,
  mergeTools,
  normalizeHome,
  readCachedHome,
  readFavoriteIds,
  readRecentTools,
  readUsageStats,
  recordUsageRemote,
  toggleFavoriteRemote,
  type ToolboxCategory,
  type ToolboxTool,
  writeCachedHome,
  writeFavoriteIds,
  writeRecentTools,
  writeUsageStats
} from '../services/toolbox'
import {
  clearStoredSession,
  fetchPerson,
  getStoredSession,
  loginByPassword,
  updatePasswordByOld,
  updatePerson,
  type AppUser
} from '../services/auth'
import {
  fetchMessages,
  fetchUnreadCount,
  markAllMessagesRead,
  markMessageRead,
  type AppMessage
} from '../services/message'
import {
  checkForUpdates,
  getUpdateStatus,
  installUpdate,
  offUpdateStatus,
  onUpdateStatus,
  type DesktopUpdateStatus
} from '../services/updater'

type ToolTab = 'new' | 'hot' | 'favorite'

const categories = ref<ToolboxCategory[]>(defaultHome.categories)
const tools = ref<ToolboxTool[]>(
  mergeTools(
    defaultHome.recommendTools,
    defaultHome.newTools,
    defaultHome.hotTools,
    defaultHome.favoriteTools,
    defaultHome.recentTools
  )
)
const activeCategory = ref('all')
const keyword = ref('')
const activeTab = ref<ToolTab>('new')
const favoriteIds = ref(readFavoriteIds())
const recentTools = ref(readRecentTools())
const usageStats = ref(readUsageStats())
const activeTool = ref<ToolboxTool | null>(null)
const sidebarCollapsed = ref(readSidebarCollapsed())
const syncStatus = ref('正在准备工具箱')
const isSyncing = ref(false)
const currentUser = ref<AppUser | null>(null)
const showLogin = ref(false)
const showAccountMenu = ref(false)
const loginError = ref('')
const isLoggingIn = ref(false)
const pendingToolId = ref<number | null>(null)
const showMessages = ref(false)
const showMessageDetail = ref(false)
const activeMessage = ref<AppMessage | null>(null)
const messages = ref<AppMessage[]>([])
const unreadCount = ref(0)
const messageError = ref('')
const lastNotifiedMessageId = ref(0)
const showProfile = ref(false)
const isSavingProfile = ref(false)
const profileError = ref('')
const profileStatus = ref('')
const showUpdateDialog = ref(false)
const isCheckingUpdate = ref(false)
const isInstallingUpdate = ref(false)
const updateError = ref('')
const updateStatus = ref<DesktopUpdateStatus>({
  phase: 'idle',
  message: '尚未检查更新',
  currentVersion: '0.0.0'
})
const loginForm = reactive({
  phone: '',
  password: ''
})
const profileForm = reactive({
  nickName: '',
  avatarUrl: '',
  description: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
let messageTimer: ReturnType<typeof setInterval> | null = null

function readSidebarCollapsed() {
  try {
    return localStorage.getItem('brmtool:sidebar-collapsed') === '1'
  } catch {
    return false
  }
}

const categoryById = computed(
  () => new Map(categories.value.map((category) => [category.id, category]))
)

const navItems = computed<ToolboxNavItem[]>(() =>
  categories.value.map((item) => ({
    code: item.code,
    name: item.name,
    icon: item.icon,
    count:
      item.code === 'all'
        ? tools.value.length
        : tools.value.filter((tool) => categoryById.value.get(tool.categoryId || 0)?.code === item.code)
            .length
  }))
)

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

const filteredTools = computed(() => {
  const result = tools.value.filter((tool) => {
    const categoryCode = categoryById.value.get(tool.categoryId || 0)?.code
    const matchCategory = activeCategory.value === 'all' || categoryCode === activeCategory.value
    const searchable = [tool.name, tool.description, tool.type, tool.keywords, ...tool.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return matchCategory && (!normalizedKeyword.value || searchable.includes(normalizedKeyword.value))
  })

  if (activeTab.value === 'favorite') {
    return result.filter((tool) => favoriteIds.value.has(tool.id))
  }

  if (activeTab.value === 'hot') {
    return [...result].sort((a, b) => Number(isTruthy(b.isHot)) - Number(isTruthy(a.isHot)))
  }

  return [...result].sort((a, b) => Number(isTruthy(b.isNew)) - Number(isTruthy(a.isNew)))
})

const favoriteTools = computed(() => tools.value.filter((tool) => favoriteIds.value.has(tool.id)))
const recommendTools = computed(() => filteredTools.value)
const showHomeBanner = computed(() => activeCategory.value === 'all')
const homepageBannerUrl = computed(() => bannerUrl)
const favoriteDisplayLimit = computed(() => (showHomeBanner.value ? 5 : 10))
const isLoggedIn = computed(() => !!currentUser.value?.id)
const profileName = computed(() => currentUser.value?.nickName || currentUser.value?.phone || '登录')
const profileInitial = computed(() => profileName.value.slice(0, 1) || '我')
const profileAvatar = computed(() => currentUser.value?.avatarUrl || '')

onMounted(async () => {
  const cached = readCachedHome()
  if (cached) {
    applyHome(normalizeHome(cached))
    syncStatus.value = '已读取本地缓存'
  }

  await restoreSession()
  await loadHome()
  startMessagePolling()
  void bindUpdateStatus()
})

onUnmounted(() => {
  if (messageTimer) clearInterval(messageTimer)
  offUpdateStatus()
})

watch([activeCategory, keyword, activeTab], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void loadToolList()
  }, 260)
})

watch(sidebarCollapsed, (value) => {
  try {
    localStorage.setItem('brmtool:sidebar-collapsed', value ? '1' : '0')
  } catch {}
})

async function loadHome() {
  isSyncing.value = true
  try {
    const home = await fetchToolboxHome()
    applyHome(home)
    writeCachedHome(home)
    syncStatus.value = '已同步后端数据'
  } catch {
    if (!readCachedHome()) {
      applyHome(defaultHome)
      syncStatus.value = '后端未连接，使用默认工具'
    } else {
      syncStatus.value = '后端未连接，继续使用缓存'
    }
  } finally {
    isSyncing.value = false
  }
}

async function loadToolList() {
  const category = categories.value.find((item) => item.code === activeCategory.value)
  try {
    const list = await fetchToolboxTools({
      categoryId: activeCategory.value === 'all' ? undefined : category?.id,
      keyword: keyword.value.trim(),
      sort: activeTab.value === 'favorite' ? undefined : activeTab.value
    })
    tools.value = mergeTools(tools.value, list)
    syncStatus.value = '工具列表已同步'
  } catch {
    syncStatus.value = '列表接口不可用，显示本地数据'
  }
}

function applyHome(home: typeof defaultHome) {
  categories.value = home.categories
  tools.value = mergeTools(
    home.recommendTools,
    home.newTools,
    home.hotTools,
    home.favoriteTools,
    home.recentTools,
    defaultHome.recommendTools
  )
  if (isLoggedIn.value || home.favoriteTools.length) {
    favoriteIds.value = new Set(home.favoriteTools.map((tool) => tool.id))
    writeFavoriteIds(favoriteIds.value)
  }
  if (home.recentTools.length) {
    recentTools.value = home.recentTools
    writeRecentTools(home.recentTools)
  }
  usageStats.value = home.usageStats || readUsageStats()
  writeUsageStats(usageStats.value)
}

async function toggleFavorite(id: number) {
  const next = new Set(favoriteIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }

  favoriteIds.value = next
  writeFavoriteIds(next)

  if (!isLoggedIn.value) {
    syncStatus.value = '未登录，收藏已暂存本地'
    return
  }

  try {
    await toggleFavoriteRemote(id)
    syncStatus.value = next.has(id) ? '收藏已同步' : '已取消收藏'
  } catch {
    syncStatus.value = '收藏已保存在本地'
  }
}

async function openTool(id: number) {
  const tool = tools.value.find((item) => item.id === id)
  if (!tool) return

  if (tool.authRequired && !isLoggedIn.value) {
    pendingToolId.value = id
    openLogin()
    syncStatus.value = '该工具需要登录后使用'
    return
  }

  activeTool.value = null
  recordLocalUsage(tool)

  if (tool.type === 'external_link' && tool.openMode === 'external_browser') {
    const result = await window.api.openExternalTool(tool.entry)
    syncStatus.value = result.success ? `已打开 ${tool.name}` : result.error || '外链打开失败'
  } else if (tool.type === 'external_link' && tool.openMode === 'embedded_webview') {
    activeTool.value = tool
    syncStatus.value = `正在桌面端浏览 ${tool.name}`
  } else if (tool.type === 'internal_web' && tool.openMode === 'internal_route') {
    activeTool.value = tool
    syncStatus.value = `正在使用 ${tool.name}`
  } else if (tool.type === 'local_plugin') {
    activeTool.value = tool
    syncStatus.value = `正在运行本地插件 ${tool.name}`
  } else {
    syncStatus.value = '当前打开方式需要后续安全评估'
  }

  void recordUsageRemote(tool.id).catch(() => {
    syncStatus.value = `${syncStatus.value}，使用记录已写入本地`
  })
}

function recordLocalUsage(tool: ToolboxTool) {
  usageStats.value = {
    todayCount: usageStats.value.todayCount + 1,
    totalCount: usageStats.value.totalCount + 1
  }
  recentTools.value = [tool, ...recentTools.value.filter((item) => item.id !== tool.id)].slice(0, 8)
  writeRecentTools(recentTools.value)
  writeUsageStats(usageStats.value)
}

async function restoreSession() {
  const session = await getStoredSession()
  if (!session.token) {
    return
  }

  try {
    currentUser.value = session.user || (await fetchPerson())
    syncStatus.value = '已恢复登录状态'
  } catch {
    await logout(false)
  }
}

function openLogin() {
  showAccountMenu.value = false
  showLogin.value = true
  loginError.value = ''
}

async function submitLogin() {
  if (!loginForm.phone || !loginForm.password) {
    loginError.value = '请输入手机号和密码'
    return
  }

  isLoggingIn.value = true
  loginError.value = ''

  try {
    const session = await loginByPassword(loginForm.phone, loginForm.password)
    currentUser.value = session.user || null
    showLogin.value = false
    loginForm.password = ''
    syncStatus.value = '登录成功，正在同步个人数据'
    await loadHome()
    await refreshMessages(true)
    startMessagePolling()

    if (pendingToolId.value) {
      const id = pendingToolId.value
      pendingToolId.value = null
      await openTool(id)
    }
  } catch (error) {
    loginError.value = (error as Error).message || '登录失败'
  } finally {
    isLoggingIn.value = false
  }
}

async function logout(showStatus = true) {
  await clearStoredSession()
  currentUser.value = null
  showAccountMenu.value = false
  showMessages.value = false
  showProfile.value = false
  showMessageDetail.value = false
  activeMessage.value = null
  messages.value = []
  unreadCount.value = 0
  if (messageTimer) clearInterval(messageTimer)
  if (showStatus) syncStatus.value = '已退出登录'
  await loadHome()
}

async function toggleMessages() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }

  showMessages.value = !showMessages.value
  if (showMessages.value) {
    await refreshMessages(false)
  }
}

async function refreshMessages(silent: boolean) {
  if (!isLoggedIn.value) return

  try {
    const [count, list] = await Promise.all([fetchUnreadCount(), fetchMessages()])
    unreadCount.value = count
    messages.value = list
    messageError.value = ''

    const important = list.find((item) => !item.isRead && item.level === 'error')
    if (important && important.id !== lastNotifiedMessageId.value) {
      lastNotifiedMessageId.value = important.id
      await window.api.sendNotification(important.title, important.content.slice(0, 120))
    }
  } catch (error) {
    if (!silent) messageError.value = (error as Error).message || '消息同步失败'
  }
}

function startMessagePolling() {
  if (messageTimer) clearInterval(messageTimer)
  if (!isLoggedIn.value) return
  messageTimer = setInterval(() => {
    void refreshMessages(true)
  }, 60_000)
}

async function openMessageDetail(message: AppMessage) {
  activeMessage.value = message
  showMessageDetail.value = true
  await readMessage(message)
}

async function readMessage(message: AppMessage) {
  if (!message.isRead) {
    await markMessageRead(message.id)
    message.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
}

async function readAllMessages() {
  await markAllMessagesRead()
  messages.value = messages.value.map((item) => ({ ...item, isRead: true }))
  unreadCount.value = 0
}

function openProfile() {
  if (!currentUser.value) {
    openLogin()
    return
  }

  showAccountMenu.value = false
  profileError.value = ''
  profileStatus.value = ''
  profileForm.nickName = currentUser.value.nickName || ''
  profileForm.avatarUrl = currentUser.value.avatarUrl || ''
  profileForm.description = currentUser.value.description || ''
  profileForm.oldPassword = ''
  profileForm.newPassword = ''
  profileForm.confirmPassword = ''
  showProfile.value = true
}

async function submitProfile() {
  if (!currentUser.value) return

  profileError.value = ''
  profileStatus.value = ''

  if (profileForm.newPassword || profileForm.oldPassword || profileForm.confirmPassword) {
    if (!profileForm.oldPassword) {
      profileError.value = '请输入旧密码'
      return
    }
    if (profileForm.newPassword.length < 6) {
      profileError.value = '新密码至少 6 位'
      return
    }
    if (profileForm.newPassword !== profileForm.confirmPassword) {
      profileError.value = '两次输入的新密码不一致'
      return
    }
  }

  isSavingProfile.value = true
  try {
    const user = await updatePerson({
      nickName: profileForm.nickName.trim(),
      avatarUrl: profileForm.avatarUrl.trim(),
      description: profileForm.description.trim()
    })
    currentUser.value = user

    if (profileForm.newPassword) {
      await updatePasswordByOld(profileForm.oldPassword, profileForm.newPassword)
      profileForm.oldPassword = ''
      profileForm.newPassword = ''
      profileForm.confirmPassword = ''
    }

    profileStatus.value = '个人资料已保存'
    syncStatus.value = '个人资料已同步'
  } catch (error) {
    profileError.value = (error as Error).message || '保存失败'
  } finally {
    isSavingProfile.value = false
  }
}

async function bindUpdateStatus() {
  onUpdateStatus((status) => {
    updateStatus.value = status

    if (['available', 'downloading', 'downloaded', 'error'].includes(status.phase)) {
      showUpdateDialog.value = true
    }
  })

  try {
    const status = await getUpdateStatus()
    if (status) {
      updateStatus.value = status
    }
  } catch {}
}

async function openUpdateDialog(manual = true) {
  showAccountMenu.value = false
  showUpdateDialog.value = true
  updateError.value = ''

  if (!manual) {
    return
  }

  isCheckingUpdate.value = true
  try {
    const status = await checkForUpdates()
    if (status) {
      updateStatus.value = status
    }
  } catch (error) {
    updateError.value = (error as Error).message || '检查更新失败'
  } finally {
    isCheckingUpdate.value = false
  }
}

async function restartAndInstallUpdate() {
  isInstallingUpdate.value = true
  updateError.value = ''

  try {
    await installUpdate()
  } catch (error) {
    updateError.value = (error as Error).message || '安装更新失败'
    isInstallingUpdate.value = false
  }
}

function formatUpdateSize(value?: number) {
  if (!value) return '--'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="toolbox-shell" :class="{ 'is-sidebar-collapsed': sidebarCollapsed }">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="brand">
        <img :src="logoUrl" alt="" />
        <strong>数智工具箱</strong>
        <button
          class="sidebar-toggle"
          type="button"
          :title="sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          {{ sidebarCollapsed ? '›' : '‹' }}
        </button>
      </div>

      <SidebarNav
        v-model="activeCategory"
        :items="navItems"
        :collapsed="sidebarCollapsed"
        @update:model-value="activeTool = null"
      />

      <MetricPanel
        v-if="!sidebarCollapsed"
        title="今日使用"
        :value="usageStats.todayCount"
        :label="`累计 ${usageStats.totalCount} 次`"
        trend="本地记录"
      />
    </aside>

    <main class="workspace" :class="{ 'is-running': activeTool }">
      <header class="topbar">
        <label class="search">
          <span>⌕</span>
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索你需要的工具，支持拼音 / 首字母快速搜索"
            @focus="activeTool = null"
          />
          <button v-if="keyword" type="button" title="清空搜索" @click="keyword = ''">×</button>
        </label>

        <div class="top-actions">
          <button
            class="update-btn"
            type="button"
            title="检查更新"
            @click="openUpdateDialog(true)"
          >
            更新
            <span
              v-if="['available', 'downloading', 'downloaded'].includes(updateStatus.phase)"
              class="update-pulse"
            />
          </button>

          <button class="notice-btn" type="button" title="消息通知" @click="toggleMessages">
            通知
            <span v-if="unreadCount" class="notice-dot">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>

          <div class="profile-wrap">
            <button
              class="profile"
              type="button"
              @click="isLoggedIn ? (showAccountMenu = !showAccountMenu) : openLogin()"
            >
              <span class="profile-avatar">
                <img v-if="profileAvatar" :src="profileAvatar" alt="" />
                <b v-else>{{ profileInitial }}</b>
              </span>
              <strong>{{ isLoggedIn ? profileName : '登录' }}</strong>
            </button>
            <div v-if="showAccountMenu" class="account-menu">
              <strong>{{ profileName }}</strong>
              <small>{{ currentUser?.phone || '已登录' }}</small>
              <button type="button" class="account-primary" @click="openUpdateDialog(true)">检查更新</button>
              <button type="button" class="account-primary" @click="openProfile">个人详情</button>
              <button type="button" @click="logout()">退出登录</button>
            </div>
          </div>
        </div>
      </header>

      <aside v-if="showMessages" class="message-drawer">
        <div class="drawer-head">
          <h2>消息通知</h2>
          <button type="button" @click="readAllMessages">全部已读</button>
        </div>
        <p v-if="messageError" class="message-error">{{ messageError }}</p>
        <div v-if="messages.length" class="message-list">
          <button
            v-for="message in messages"
            :key="message.id"
            class="message-item"
            :class="{ unread: !message.isRead, important: message.level === 'error' }"
            type="button"
            @click="openMessageDetail(message)"
          >
            <span>{{ message.title }}</span>
            <small>{{ message.content }}</small>
          </button>
        </div>
        <p v-else class="empty-inline">暂无消息。</p>
      </aside>

      <div v-if="activeTool" class="runner-stage">
        <InternalToolRunner
          class="tool-runner-view"
          :tool="activeTool"
          @back="activeTool = null"
        />
      </div>

      <template v-else>
        <section v-if="showHomeBanner" class="hero">
          <img class="hero-image" :src="homepageBannerUrl" alt="" />
          <div class="hero-copy">
            <p>欢迎使用 数智工具箱</p>
            <h1>高效、便捷、智能、全面</h1>
            <span>一站式工具集合，让工作与学习更轻松</span>
          </div>
          <div class="hero-visual" aria-hidden="true">
            <span class="cube c1" />
            <span class="cube c2" />
            <span class="cube c3" />
            <span class="cube c4" />
          </div>
        </section>

        <section
          class="section favorites"
          :class="{ 'home-favorites': showHomeBanner, 'category-favorites': !showHomeBanner }"
        >
          <div class="section-head">
            <h2>我的收藏</h2>
            <button type="button" @click="activeTab = 'favorite'">查看全部 ›</button>
          </div>
          <div v-if="favoriteTools.length" class="favorite-strip">
            <ToolCard
              v-for="tool in favoriteTools.slice(0, favoriteDisplayLimit)"
              :key="tool.id"
              :tool="tool"
              :favorite="favoriteIds.has(tool.id)"
              compact
              @toggle-favorite="toggleFavorite"
              @open="openTool"
            />
          </div>
          <div v-else class="empty-inline">还没有收藏工具。</div>
        </section>

        <section class="content-grid" :class="{ 'category-content': !showHomeBanner }">
          <section class="section">
            <div class="section-head with-tabs">
              <h2>推荐工具</h2>
              <div class="tabs">
                <button
                  :class="{ active: activeTab === 'new' }"
                  type="button"
                  @click="activeTab = 'new'"
                >
                  最新
                </button>
                <button
                  :class="{ active: activeTab === 'hot' }"
                  type="button"
                  @click="activeTab = 'hot'"
                >
                  最热
                </button>
                <button
                  :class="{ active: activeTab === 'favorite' }"
                  type="button"
                  @click="activeTab = 'favorite'"
                >
                  收藏最多
                </button>
              </div>
            </div>

            <div v-if="recommendTools.length" class="tool-grid">
              <ToolCard
                v-for="tool in recommendTools"
                :key="tool.id"
                :tool="tool"
                :favorite="favoriteIds.has(tool.id)"
                @toggle-favorite="toggleFavorite"
                @open="openTool"
              />
            </div>

            <div v-else class="empty-state">
              <strong>没有找到匹配工具</strong>
              <span>换个关键词或分类再试试。</span>
            </div>
          </section>
        </section>
      </template>
    </main>

    <div v-if="showLogin" class="modal-mask" @click.self="showLogin = false">
      <form class="login-panel" @submit.prevent="submitLogin">
        <h2>登录数智工具箱</h2>
        <p>登录后可同步收藏、使用记录，并访问受保护工具。</p>
        <label>
          <span>手机号</span>
          <input v-model="loginForm.phone" type="tel" autocomplete="username" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="loginForm.password" type="password" autocomplete="current-password" />
        </label>
        <strong v-if="loginError" class="login-error">{{ loginError }}</strong>
        <div class="login-actions">
          <button type="button" @click="showLogin = false">取消</button>
          <button type="submit" :disabled="isLoggingIn">
            {{ isLoggingIn ? '登录中' : '登录' }}
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="showMessageDetail && activeMessage"
      class="modal-mask"
      @click.self="showMessageDetail = false"
    >
      <article class="dialog-panel message-detail">
        <div class="dialog-head">
          <div>
            <span class="dialog-kicker">消息详情</span>
            <h2>{{ activeMessage.title }}</h2>
          </div>
          <button type="button" title="关闭" @click="showMessageDetail = false">×</button>
        </div>
        <div class="message-meta">
          <span :class="['level-pill', activeMessage.level]">{{ activeMessage.level }}</span>
          <span>{{ activeMessage.publishTime || activeMessage.createTime || '未设置发布时间' }}</span>
          <span>已读</span>
        </div>
        <p class="message-content">{{ activeMessage.content }}</p>
        <div class="dialog-actions">
          <button type="button" @click="showMessageDetail = false">关闭</button>
        </div>
      </article>
    </div>

    <div v-if="showProfile" class="modal-mask" @click.self="showProfile = false">
      <form class="dialog-panel profile-panel" @submit.prevent="submitProfile">
        <div class="dialog-head">
          <div>
            <span class="dialog-kicker">账号中心</span>
            <h2>个人详情</h2>
          </div>
          <button type="button" title="关闭" @click="showProfile = false">×</button>
        </div>

        <div class="profile-editor">
          <div class="avatar-preview">
            <img v-if="profileForm.avatarUrl" :src="profileForm.avatarUrl" alt="" />
            <span v-else>{{ profileForm.nickName.slice(0, 1) || profileInitial }}</span>
          </div>
          <div class="profile-fields">
            <label>
              <span>昵称</span>
              <input v-model="profileForm.nickName" type="text" maxlength="40" />
            </label>
            <label>
              <span>头像地址</span>
              <input v-model="profileForm.avatarUrl" type="url" placeholder="https://..." />
            </label>
            <label>
              <span>个人介绍</span>
              <textarea v-model="profileForm.description" rows="3" maxlength="200" />
            </label>
          </div>
        </div>

        <div class="password-block">
          <h3>修改密码</h3>
          <div class="password-grid">
            <label>
              <span>旧密码</span>
              <input v-model="profileForm.oldPassword" type="password" autocomplete="current-password" />
            </label>
            <label>
              <span>新密码</span>
              <input v-model="profileForm.newPassword" type="password" autocomplete="new-password" />
            </label>
            <label>
              <span>确认新密码</span>
              <input v-model="profileForm.confirmPassword" type="password" autocomplete="new-password" />
            </label>
          </div>
        </div>

        <strong v-if="profileError" class="login-error">{{ profileError }}</strong>
        <strong v-if="profileStatus" class="profile-status">{{ profileStatus }}</strong>
        <div class="dialog-actions">
          <button type="button" @click="showProfile = false">取消</button>
          <button type="submit" :disabled="isSavingProfile">
            {{ isSavingProfile ? '保存中' : '保存' }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="showUpdateDialog" class="modal-mask" @click.self="showUpdateDialog = false">
      <article class="dialog-panel update-panel">
        <div class="dialog-head">
          <div>
            <span class="dialog-kicker">桌面端更新</span>
            <h2>{{ updateStatus.message }}</h2>
          </div>
          <button type="button" title="关闭" @click="showUpdateDialog = false">×</button>
        </div>

        <div class="update-grid">
          <div>
            <span>当前版本</span>
            <strong>{{ updateStatus.currentVersion }}</strong>
          </div>
          <div>
            <span>最新版本</span>
            <strong>{{ updateStatus.latestVersion || '--' }}</strong>
          </div>
          <div>
            <span>状态</span>
            <strong>{{ updateStatus.phase }}</strong>
          </div>
        </div>

        <div class="update-progress">
          <div>
            <span :style="{ width: `${Math.min(100, Math.max(0, updateStatus.percent || 0))}%` }" />
          </div>
          <small>
            {{ Math.floor(updateStatus.percent || 0) }}%
            · {{ formatUpdateSize(updateStatus.transferred) }} / {{ formatUpdateSize(updateStatus.total) }}
          </small>
        </div>

        <p v-if="updateStatus.error || updateError" class="login-error">
          {{ updateError || updateStatus.error }}
        </p>

        <div class="dialog-actions">
          <button type="button" @click="showUpdateDialog = false">稍后</button>
          <button type="button" :disabled="isCheckingUpdate" @click="openUpdateDialog(true)">
            {{ isCheckingUpdate ? '检查中' : '重新检查' }}
          </button>
          <button
            v-if="updateStatus.phase === 'downloaded'"
            type="button"
            :disabled="isInstallingUpdate"
            @click="restartAndInstallUpdate"
          >
            {{ isInstallingUpdate ? '正在重启' : '立即重启安装' }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.toolbox-shell {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: clamp(214px, 17vw, 236px) minmax(0, 1fr);
  background:
    linear-gradient(rgba(42, 185, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(42, 185, 255, 0.045) 1px, transparent 1px),
    radial-gradient(circle at 78% 18%, rgba(0, 140, 255, 0.2), transparent 31%),
    linear-gradient(135deg, #051325 0%, #071b36 48%, #04101f 100%);
  background-size:
    44px 44px,
    44px 44px,
    auto,
    auto;
  color: #dceeff;
  overflow: hidden;
  transition: grid-template-columns 0.18s ease;
}

.toolbox-shell.is-sidebar-collapsed {
  grid-template-columns: 76px minmax(0, 1fr);
}

.sidebar {
  box-sizing: border-box;
  min-width: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
  padding: 20px 12px 18px;
  border-right: 1px solid rgba(70, 130, 185, 0.3);
  background: rgba(4, 17, 35, 0.62);
  backdrop-filter: blur(16px);
  overflow: hidden;
  transition:
    padding 0.18s ease,
    gap 0.18s ease;
}

.sidebar.collapsed {
  gap: 12px;
  padding: 16px 8px;
}

.brand {
  box-sizing: border-box;
  min-width: 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 30px;
  align-items: center;
  gap: 10px;
  padding: 0 4px 6px;
}

.sidebar.collapsed .brand {
  grid-template-columns: 1fr;
  justify-items: center;
  gap: 8px;
  padding: 0 0 4px;
}

.brand img {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 0 16px rgba(26, 162, 255, 0.55));
}

.brand strong {
  min-width: 0;
  overflow: hidden;
  color: #f1f8ff;
  font-size: 20px;
  font-weight: 780;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar.collapsed .brand strong {
  display: none;
}

.sidebar-toggle {
  box-sizing: border-box;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(91, 172, 235, 0.3);
  border-radius: 8px;
  background: rgba(6, 29, 61, 0.66);
  color: #8fdfff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.workspace {
  box-sizing: border-box;
  position: relative;
  min-width: 0;
  height: 100%;
  display: grid;
  grid-auto-rows: auto;
  align-content: start;
  gap: 10px;
  padding: clamp(16px, 1.6vw, 22px);
  overflow: auto;
}

.workspace.is-running {
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
  overflow: hidden;
}

.runner-stage {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.tool-runner-view {
  height: 100%;
  min-height: 0;
}

.topbar {
  display: grid;
  grid-template-columns: minmax(280px, 640px) auto;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.search {
  height: 44px;
  display: grid;
  grid-template-columns: 36px 1fr 34px;
  align-items: center;
  padding: 0 8px 0 12px;
  border: 1px solid rgba(31, 191, 255, 0.72);
  border-radius: 8px;
  background: rgba(4, 24, 50, 0.76);
  box-shadow:
    inset 0 0 24px rgba(0, 156, 255, 0.12),
    0 0 28px rgba(0, 149, 255, 0.2);
}

.search span {
  color: #d7f8ff;
  font-size: 23px;
}

.search input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #f0fbff;
  font-size: 15px;
}

.search input::placeholder {
  color: #6e86ad;
}

.search button,
.section-head button,
.tabs button,
.profile,
.notice-btn,
.update-btn,
.account-menu button,
.drawer-head button,
.login-actions button,
.dialog-head button,
.dialog-actions button {
  border: 1px solid rgba(91, 172, 235, 0.28);
  border-radius: 8px;
  background: rgba(6, 29, 61, 0.66);
  color: #a8bddb;
  cursor: pointer;
}

.search button {
  width: 28px;
  height: 28px;
  color: #53e8ff;
  font-size: 21px;
  line-height: 1;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.update-btn {
  position: relative;
  height: 38px;
  min-width: 60px;
  padding: 0 12px;
  color: #d7efff;
  font-size: 13px;
}

.update-pulse {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #36ffd4;
  box-shadow: 0 0 14px rgba(54, 255, 212, 0.72);
}

.notice-btn {
  position: relative;
  height: 38px;
  min-width: 60px;
  padding: 0 12px;
  color: #d7efff;
  font-size: 13px;
}

.notice-dot {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border-radius: 999px;
  background: #1fe7ff;
  color: #041326;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 0 18px rgba(31, 231, 255, 0.42);
}

.profile-wrap {
  position: relative;
}

.profile {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
}

.profile-avatar {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, #dce9ff, #6d8fc7);
  color: #102247;
  font-size: 13px;
  font-weight: 800;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar b {
  font: inherit;
}

.profile strong {
  color: #f0f7ff;
  font-size: 14px;
  font-weight: 700;
}

.account-menu {
  position: absolute;
  z-index: 20;
  top: 46px;
  right: 0;
  width: 190px;
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(69, 164, 236, 0.42);
  border-radius: 8px;
  background: rgba(4, 18, 38, 0.96);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.34);
}

.account-menu strong {
  color: #eef8ff;
  font-size: 14px;
}

.account-menu small {
  color: #8fa7cc;
  font-size: 12px;
}

.account-menu button {
  height: 32px;
  color: #ffb8b8;
}

.account-menu .account-primary {
  color: #53e8ff;
}

.message-drawer {
  position: absolute;
  z-index: 18;
  top: 62px;
  right: clamp(16px, 1.6vw, 22px);
  width: min(360px, calc(100% - 32px));
  max-height: min(520px, calc(100% - 84px));
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 10px;
  padding: 14px;
  overflow: hidden;
  border: 1px solid rgba(69, 164, 236, 0.44);
  border-radius: 8px;
  background: rgba(4, 18, 38, 0.96);
  box-shadow:
    inset 0 0 28px rgba(0, 136, 255, 0.08),
    0 22px 60px rgba(0, 0, 0, 0.36);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.drawer-head h2 {
  color: #f1f8ff;
  font-size: 17px;
}

.drawer-head button {
  height: 30px;
  padding: 0 10px;
  color: #52dbff;
}

.message-list {
  min-height: 0;
  display: grid;
  gap: 8px;
  overflow: auto;
}

.message-item {
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid rgba(91, 172, 235, 0.24);
  border-radius: 8px;
  background: rgba(8, 35, 70, 0.72);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.message-item span {
  color: #edf8ff;
  font-size: 14px;
  font-weight: 760;
}

.message-item small {
  display: -webkit-box;
  overflow: hidden;
  color: #91a7cc;
  font-size: 12px;
  line-height: 1.45;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.message-item.unread {
  border-color: rgba(36, 207, 255, 0.58);
}

.message-item.important {
  border-color: rgba(255, 92, 92, 0.5);
}

.message-error,
.login-error {
  color: #ff9d9d;
  font-size: 13px;
}

.modal-mask {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(1, 8, 18, 0.68);
  backdrop-filter: blur(8px);
}

.login-panel {
  width: min(380px, 100%);
  display: grid;
  gap: 14px;
  padding: 22px;
  border: 1px solid rgba(57, 191, 255, 0.5);
  border-radius: 8px;
  background:
    linear-gradient(140deg, rgba(8, 52, 98, 0.96), rgba(4, 18, 38, 0.98)),
    rgba(4, 18, 38, 0.98);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
}

.dialog-panel {
  width: min(560px, 100%);
  max-height: min(680px, calc(100vh - 40px));
  display: grid;
  gap: 14px;
  overflow: auto;
  padding: 22px;
  border: 1px solid rgba(57, 191, 255, 0.5);
  border-radius: 8px;
  background:
    linear-gradient(140deg, rgba(8, 52, 98, 0.96), rgba(4, 18, 38, 0.98)),
    rgba(4, 18, 38, 0.98);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
}

.dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dialog-head h2 {
  margin-top: 4px;
  color: #f1f8ff;
  font-size: 21px;
}

.dialog-head button {
  width: 34px;
  height: 34px;
  color: #8fdfff;
  font-size: 22px;
  line-height: 1;
}

.dialog-kicker {
  color: #24e6ff;
  font-size: 12px;
  font-weight: 800;
}

.message-detail {
  width: min(520px, 100%);
}

.message-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #8fa7cc;
  font-size: 12px;
}

.level-pill {
  padding: 2px 8px;
  border: 1px solid rgba(91, 172, 235, 0.32);
  border-radius: 999px;
  color: #b7d8ff;
}

.level-pill.error {
  border-color: rgba(255, 92, 92, 0.5);
  color: #ffb8b8;
}

.level-pill.warning {
  border-color: rgba(255, 197, 81, 0.55);
  color: #ffd684;
}

.level-pill.success {
  border-color: rgba(54, 224, 164, 0.5);
  color: #7affd8;
}

.message-content {
  min-height: 120px;
  padding: 14px;
  border: 1px solid rgba(91, 172, 235, 0.22);
  border-radius: 8px;
  background: rgba(4, 19, 42, 0.56);
  color: #dceeff;
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.profile-panel {
  width: min(650px, 100%);
}

.profile-editor {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 16px;
}

.avatar-preview {
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(57, 191, 255, 0.42);
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(35, 206, 255, 0.26), rgba(7, 42, 90, 0.8));
  color: #f0fbff;
  font-size: 34px;
  font-weight: 800;
  box-shadow: 0 0 28px rgba(35, 169, 255, 0.22);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-fields,
.password-grid {
  display: grid;
  gap: 10px;
}

.password-block {
  display: grid;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(91, 172, 235, 0.18);
}

.password-block h3 {
  margin: 0;
  color: #e8f6ff;
  font-size: 15px;
}

.profile-panel label {
  display: grid;
  gap: 7px;
  color: #bad4f7;
  font-size: 13px;
}

.profile-panel input,
.profile-panel textarea {
  width: 100%;
  border: 1px solid rgba(91, 172, 235, 0.32);
  border-radius: 8px;
  outline: 0;
  padding: 9px 12px;
  background: rgba(4, 19, 42, 0.78);
  color: #f0fbff;
  resize: vertical;
}

.profile-status {
  color: #7affd8;
  font-size: 13px;
}

.update-panel {
  width: min(560px, 100%);
}

.update-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.update-grid div {
  display: grid;
  gap: 7px;
  padding: 12px;
  border: 1px solid rgba(91, 172, 235, 0.22);
  border-radius: 8px;
  background: rgba(4, 19, 42, 0.58);
}

.update-grid span {
  color: #8fa7cc;
  font-size: 12px;
}

.update-grid strong {
  min-width: 0;
  overflow: hidden;
  color: #eef8ff;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.update-progress {
  display: grid;
  gap: 8px;
}

.update-progress div {
  height: 10px;
  overflow: hidden;
  border: 1px solid rgba(57, 191, 255, 0.3);
  border-radius: 999px;
  background: rgba(4, 19, 42, 0.74);
}

.update-progress span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: linear-gradient(90deg, #1dd7ff, #36ffd4);
  box-shadow: 0 0 18px rgba(35, 214, 255, 0.42);
  transition: width 180ms ease;
}

.update-progress small {
  color: #8fa7cc;
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-actions button {
  height: 34px;
  min-width: 72px;
  padding: 0 12px;
}

.dialog-actions button[type='submit'],
.dialog-actions button:last-child {
  color: #f5fbff;
  border-color: rgba(39, 190, 255, 0.74);
  background: linear-gradient(180deg, rgba(14, 114, 223, 0.82), rgba(6, 55, 116, 0.72));
}

.login-panel h2 {
  color: #f1f8ff;
  font-size: 21px;
}

.login-panel p {
  color: #8fa7cc;
  font-size: 13px;
  line-height: 1.6;
}

.login-panel label {
  display: grid;
  gap: 7px;
  color: #bad4f7;
  font-size: 13px;
}

.login-panel input {
  height: 38px;
  border: 1px solid rgba(91, 172, 235, 0.32);
  border-radius: 8px;
  outline: 0;
  padding: 0 12px;
  background: rgba(4, 19, 42, 0.78);
  color: #f0fbff;
}

.login-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.login-actions button {
  height: 34px;
  min-width: 72px;
  padding: 0 12px;
}

.login-actions button[type='submit'] {
  color: #f5fbff;
  border-color: rgba(39, 190, 255, 0.74);
  background: linear-gradient(180deg, rgba(14, 114, 223, 0.82), rgba(6, 55, 116, 0.72));
}

.hero {
  position: relative;
  height: 120px;
  min-height: 120px;
  display: grid;
  grid-template-columns: minmax(280px, 0.86fr) minmax(280px, 1fr);
  align-items: center;
  overflow: hidden;
  border: 1px solid rgba(58, 142, 218, 0.32);
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(5, 24, 50, 0.95), rgba(4, 28, 61, 0.74)),
    repeating-linear-gradient(105deg, transparent 0 34px, rgba(52, 181, 255, 0.04) 35px 36px);
}

.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(3, 13, 29, 0.94) 0%, rgba(3, 16, 34, 0.68) 42%, rgba(3, 16, 34, 0.06) 100%);
  pointer-events: none;
}

.hero-image {
  position: absolute;
  inset: 0 0 0 auto;
  width: min(72%, 920px);
  height: 100%;
  object-fit: cover;
  object-position: right center;
  opacity: 0.92;
}

.hero-copy {
  position: relative;
  z-index: 1;
  padding: 18px 28px;
}

.hero-copy p {
  color: #24e6ff;
  font-size: 21px;
  font-weight: 780;
}

.hero-copy h1 {
  margin-top: 5px;
  color: #f1f7ff;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.35;
}

.hero-copy span {
  display: block;
  margin-top: 5px;
  color: #8ea5ca;
  font-size: 13px;
}

.hero-visual {
  z-index: 1;
  position: relative;
  height: 120px;
  background:
    linear-gradient(90deg, transparent, rgba(16, 178, 255, 0.05)),
    repeating-linear-gradient(0deg, rgba(48, 180, 255, 0.08) 0 1px, transparent 1px 22px);
}

.hero-visual::before {
  content: '';
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 16px;
  height: 22px;
  border: 1px solid rgba(48, 217, 255, 0.48);
  border-radius: 50%;
  transform: perspective(180px) rotateX(58deg);
  box-shadow: 0 0 26px rgba(37, 208, 255, 0.3);
}

.cube {
  position: absolute;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(59, 231, 255, 0.72);
  background: linear-gradient(145deg, rgba(33, 210, 255, 0.42), rgba(8, 62, 136, 0.28));
  box-shadow:
    inset 0 0 20px rgba(95, 234, 255, 0.18),
    0 0 26px rgba(29, 166, 255, 0.32);
  transform: skewY(-8deg);
}

.c1 {
  right: 126px;
  bottom: 38px;
}

.c2 {
  right: 78px;
  bottom: 30px;
}

.c3 {
  right: 104px;
  bottom: 66px;
}

.c4 {
  right: 38px;
  bottom: 42px;
}

.section {
  border: 1px solid rgba(42, 145, 225, 0.42);
  border-radius: 8px;
  background: rgba(5, 23, 49, 0.74);
  box-shadow: inset 0 0 28px rgba(0, 136, 255, 0.08);
}

.section-head {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 clamp(12px, 1.2vw, 16px);
}

.section-head h2 {
  color: #f1f8ff;
  font-size: 17px;
  font-weight: 760;
}

.section-head button {
  height: 28px;
  padding: 0 10px;
  color: #52dbff;
  font-size: 13px;
}

.favorite-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
  padding: 0 12px 12px;
}

.home-favorites {
  position: relative;
  z-index: 2;
  margin-top: 0;
}

.home-favorites .favorite-strip {
  grid-template-columns: repeat(5, minmax(150px, 1fr));
}

.category-favorites {
  margin-top: 0;
}

.category-favorites .favorite-strip {
  grid-template-columns: repeat(3, minmax(210px, 1fr));
  grid-auto-rows: minmax(88px, auto);
}

.empty-inline {
  padding: 0 16px 16px;
  color: #8fa7cc;
  font-size: 13px;
}

.content-grid {
  min-height: 0;
  display: block;
}

.category-content {
  margin-top: 12px;
}

.with-tabs {
  flex-wrap: wrap;
  align-items: center;
  padding-top: 6px;
  padding-bottom: 6px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tabs button {
  height: 28px;
  min-width: 64px;
  padding: 0 10px;
  font-size: 13px;
}

.tabs button.active {
  color: #f5fbff;
  border-color: rgba(39, 190, 255, 0.74);
  background: linear-gradient(180deg, rgba(14, 114, 223, 0.82), rgba(6, 55, 116, 0.72));
  box-shadow: 0 0 18px rgba(35, 169, 255, 0.24);
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  padding: 0 12px 12px;
}

.home-favorites + .content-grid .tool-grid {
  grid-template-columns: repeat(4, minmax(190px, 1fr));
  grid-auto-rows: minmax(116px, auto);
}

.category-content .tool-grid {
  grid-auto-rows: minmax(116px, auto);
}

.empty-state {
  min-height: 240px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 24px;
  color: #8ba2c6;
}

.empty-state strong {
  color: #e3f5ff;
  font-size: 18px;
  font-weight: 760;
}

button:hover {
  border-color: rgba(60, 221, 255, 0.7);
  color: #ecfbff;
}

@media (max-width: 1260px) {
  .toolbox-shell {
    grid-template-columns: 214px minmax(0, 1fr);
  }

  .workspace {
    padding: 16px;
  }

  .favorite-strip {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  }

  .home-favorites .favorite-strip {
    grid-template-columns: repeat(5, minmax(135px, 1fr));
  }

  .category-favorites .favorite-strip {
    grid-template-columns: repeat(2, minmax(210px, 1fr));
  }
}

@media (min-width: 1560px) {
  .tool-grid {
    grid-template-columns: repeat(5, minmax(220px, 1fr));
  }

  .home-favorites + .content-grid .tool-grid {
    grid-template-columns: repeat(4, minmax(240px, 1fr));
  }

  .category-content .tool-grid {
    grid-template-columns: repeat(4, minmax(240px, 1fr));
  }
}

@media (max-width: 900px) {
  .toolbox-shell {
    grid-template-columns: 76px minmax(0, 1fr);
  }

  .sidebar {
    padding: 16px 8px;
  }

  .brand {
    justify-content: center;
    padding: 0;
  }

  .brand strong,
  .hero-visual {
    display: none;
  }

  .hero,
  .topbar {
    grid-template-columns: 1fr;
  }

  .topbar {
    gap: 12px;
  }

  .hero {
    min-height: 156px;
  }

  .hero-image {
    width: 100%;
    opacity: 0.62;
  }

  .hero-copy {
    padding: 20px;
  }

  .favorite-strip,
  .home-favorites .favorite-strip,
  .category-favorites .favorite-strip,
  .tool-grid {
    grid-template-columns: 1fr;
  }

  .profile-editor {
    grid-template-columns: 1fr;
  }

  .update-grid {
    grid-template-columns: 1fr;
  }
}
</style>
