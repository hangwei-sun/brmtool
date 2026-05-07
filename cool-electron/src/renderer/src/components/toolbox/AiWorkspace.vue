<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  deleteAiConversation,
  fetchAiConversation,
  fetchAiConversations,
  fetchAiModels,
  fetchAiTemplates,
  generateAiMedia,
  startAiStream,
  stopAiStream,
  type AiConversation,
  type AiMessage,
  type AiModel,
  type AiTemplate
} from '../../services/ai'

const props = defineProps<{
  isLoggedIn: boolean
}>()

const emit = defineEmits<{
  requireLogin: []
}>()

const models = ref<AiModel[]>([])
const templates = ref<AiTemplate[]>([])
const conversations = ref<AiConversation[]>([])
const messages = ref<AiMessage[]>([])
const selectedModelId = ref('deepseek-v4-pro')
const selectedTemplateId = ref<number | undefined>()
const activeConversationId = ref<number | undefined>()
const mode = ref<'agent' | 'writing'>('agent')
const generationType = ref<'text' | 'image' | 'audio_music' | 'audio_speech' | 'video'>('text')
const thinking = ref(true)
const prompt = ref('')
const isLoading = ref(false)
const isGenerating = ref(false)
const error = ref('')
const currentRequestId = ref('')
const messagePane = ref<HTMLElement | null>(null)
const isPanelCollapsed = ref(false)
const mediaPreviewUrls = ref<Record<string, string>>({})
const mediaPreviewLoading = new Set<string>()

const selectedTemplate = computed(() =>
  templates.value.find(item => item.id === selectedTemplateId.value)
)
const activeModels = computed(() =>
  models.value.filter(item => item.capability === generationType.value)
)
const canSend = computed(() => prompt.value.trim().length > 0 && !isGenerating.value)
const activeConversationTitle = computed(() => {
  const item = conversations.value.find(conversation => conversation.id === activeConversationId.value)
  return item?.title || '今天'
})
const shortActiveConversationTitle = computed(() => truncateText(activeConversationTitle.value, 20))

onMounted(() => {
  window.api.onAiStreamEvent(handleStreamEvent)
  if (props.isLoggedIn) {
    void loadAiData()
  }
})

onUnmounted(() => {
  window.api.offAiStreamEvent()
  if (currentRequestId.value) {
    void stopAiStream(currentRequestId.value)
  }
  revokeMediaPreviews()
})

watch(
  () => props.isLoggedIn,
  (value) => {
    if (value) {
      void loadAiData()
    } else {
      resetWorkspace()
    }
  }
)

watch(
  messages,
  () => {
    void preloadMediaPreviews()
  },
  { deep: true, flush: 'post' }
)

async function loadAiData() {
  isLoading.value = true
  error.value = ''
  try {
    const [modelList, templateList, conversationList] = await Promise.all([
      fetchAiModels(),
      fetchAiTemplates(),
      fetchAiConversations()
    ])
    models.value = modelList
    templates.value = templateList
    conversations.value = conversationList

    const defaultModel = modelList.find(item => item.isDefault) || modelList[0]
    const defaultTextModel = modelList.find(item => item.capability === 'text' && item.isDefault)
      || modelList.find(item => item.capability === 'text')
      || defaultModel
    if (defaultModel) {
      selectedModelId.value = defaultTextModel.modelId
      thinking.value = Boolean(defaultTextModel.thinkingDefault)
    }
  } catch (err) {
    error.value = (err as Error).message || 'AI 工作台加载失败'
  } finally {
    isLoading.value = false
  }
}

function resetWorkspace() {
  revokeMediaPreviews()
  conversations.value = []
  messages.value = []
  activeConversationId.value = undefined
  selectedTemplateId.value = undefined
  prompt.value = ''
  error.value = ''
}

function requireLogin() {
  emit('requireLogin')
}

function newConversation() {
  revokeMediaPreviews()
  activeConversationId.value = undefined
  selectedTemplateId.value = undefined
  messages.value = []
  prompt.value = ''
  error.value = ''
}

function togglePanel() {
  isPanelCollapsed.value = !isPanelCollapsed.value
}

async function openConversation(id: number) {
  if (!props.isLoggedIn) {
    requireLogin()
    return
  }

  isLoading.value = true
  error.value = ''
  try {
    const data = await fetchAiConversation(id)
    activeConversationId.value = data.conversation.id
    const conversationMode = data.conversation.mode
    if (isMediaMode(conversationMode)) {
      generationType.value = conversationMode
    } else {
      generationType.value = 'text'
      mode.value = conversationMode === 'writing' ? 'writing' : 'agent'
    }
    selectDefaultModelForCapability(data.conversation.modelId)
    thinking.value = Boolean(data.conversation.thinking)
    revokeMediaPreviews()
    messages.value = data.messages || []
    scrollToBottom()
  } catch (err) {
    error.value = (err as Error).message || '会话加载失败'
  } finally {
    isLoading.value = false
  }
}

async function removeConversation(id: number) {
  try {
    await deleteAiConversation(id)
    conversations.value = conversations.value.filter(item => item.id !== id)
    if (activeConversationId.value === id) {
      newConversation()
    }
  } catch (err) {
    error.value = (err as Error).message || '删除会话失败'
  }
}

function pickCapability(nextMode: 'agent' | 'writing' | 'image' | 'audio' | 'video') {
  if (nextMode === 'agent' || nextMode === 'writing') {
    generationType.value = 'text'
    mode.value = nextMode
  } else if (nextMode === 'audio') {
    generationType.value = 'audio_music'
  } else {
    generationType.value = nextMode
  }
  selectDefaultModelForCapability()
  error.value = ''
}

function pickSpeechCapability() {
  generationType.value = 'audio_speech'
  selectDefaultModelForCapability()
  error.value = ''
}

function selectDefaultModelForCapability(preferredModelId?: string) {
  const candidates = models.value.filter(item => item.capability === generationType.value)
  const model = candidates.find(item => item.modelId === preferredModelId)
    || candidates.find(item => item.isDefault)
    || candidates[0]
  if (model) {
    selectedModelId.value = model.modelId
    thinking.value = Boolean(model.thinkingDefault)
  }
}

function isMediaMode(value?: string): value is typeof generationType.value {
  return ['image', 'audio_music', 'audio_speech', 'video'].includes(String(value || ''))
}

function pickTemplate(template: AiTemplate) {
  selectedTemplateId.value = template.id
  mode.value = template.category === 'short' ? 'writing' : 'agent'
  prompt.value = ''
  error.value = ''
}

function truncateText(value: string, maxLength: number) {
  const chars = Array.from(String(value || ''))
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join('')}...` : value
}

function scrollToBottom() {
  void nextTick(() => {
    if (messagePane.value) {
      messagePane.value.scrollTop = messagePane.value.scrollHeight
    }
  })
}

async function sendPrompt() {
  if (!props.isLoggedIn) {
    requireLogin()
    return
  }
  const content = prompt.value.trim()
  if (!content || isGenerating.value) {
    return
  }
  if (generationType.value !== 'text') {
    await sendGeneration(content)
    return
  }

  const requestId = `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`
  currentRequestId.value = requestId
  isGenerating.value = true
  error.value = ''

  messages.value.push({
    id: Date.now(),
    conversationId: activeConversationId.value || 0,
    role: 'user',
    content,
    status: 1
  })
  messages.value.push({
    id: Date.now() + 1,
    conversationId: activeConversationId.value || 0,
    role: 'assistant',
    content: '',
    reasoningContent: '',
    modelId: selectedModelId.value,
    status: 1
  })
  prompt.value = ''
  scrollToBottom()

  void startAiStream({
    requestId,
    conversationId: activeConversationId.value,
    content,
    modelId: selectedModelId.value,
    thinking: thinking.value,
    mode: mode.value,
    templateId: selectedTemplateId.value
  }).then(result => {
    if (!result.success) {
      isGenerating.value = false
      error.value = result.error || 'AI 生成失败'
    }
  })
}

async function sendGeneration(content: string) {
  const type = generationType.value
  if (type === 'text') {
    return
  }
  isGenerating.value = true
  error.value = ''
  messages.value.push({
    id: Date.now(),
    conversationId: activeConversationId.value || 0,
    role: 'user',
    content,
    status: 1
  })
  const assistantMessage: AiMessage = {
    id: Date.now() + 1,
    conversationId: activeConversationId.value || 0,
    role: 'assistant',
    content: `${generationLabel(type)}生成中...`,
    modelId: selectedModelId.value,
    status: 1
  }
  messages.value.push(assistantMessage)
  prompt.value = ''
  scrollToBottom()

  try {
    const data = await generateAiMedia({
      type,
      prompt: content,
      modelId: selectedModelId.value,
      conversationId: activeConversationId.value
    })
    const generation = data.generation
    if (data.conversation) {
      activeConversationId.value = data.conversation.id
    }
    const urls = generation.outputUrls || []
    assistantMessage.content =
      data.message?.content ||
      (generation.status === 'processing'
        ? `${generationLabel(generation.type)}任务已提交，任务 ID：${generation.taskId || generation.id}\n可稍后刷新生成记录查看结果。`
        : urls.length
          ? `${generationLabel(generation.type)}生成完成：\n${urls.join('\n')}`
          : `${generationLabel(generation.type)}生成完成，但响应中未解析到资源地址，请在后台检查原始响应。`)
    assistantMessage.conversationId = activeConversationId.value || 0
    assistantMessage.id = data.message?.id || assistantMessage.id
    void refreshConversations()
  } catch (err) {
    assistantMessage.status = 2
    assistantMessage.content = ''
    assistantMessage.errorMessage = (err as Error).message || '生成失败'
    error.value = assistantMessage.errorMessage
    void refreshConversations()
  } finally {
    isGenerating.value = false
    scrollToBottom()
  }
}

function generationLabel(type: typeof generationType.value) {
  const labels = {
    text: '文本',
    image: '图片',
    audio_music: '音乐',
    audio_speech: '语音',
    video: '视频'
  }
  return labels[type]
}

function urlsFromText(content?: string) {
  return String(content || '').match(/https?:\/\/\S+/g) || []
}

function mediaKind(url: string) {
  const clean = url.split('?')[0].toLowerCase()
  if (/^data:image\//i.test(url)) return 'image'
  if (/^data:audio\//i.test(url)) return 'audio'
  if (/^data:video\//i.test(url)) return 'video'
  if (/\.(png|jpe?g|webp|gif)$/.test(clean)) return 'image'
  if (/\.(mp3|wav|m4a|aac|ogg)$/.test(clean)) return 'audio'
  if (/\.(mp4|webm|mov|m4v)$/.test(clean)) return 'video'
  return 'link'
}

function mediaItems(message: AiMessage) {
  const urls = urlsFromText(message.content)
  const content = String(message.content || '')
  return urls.map((url) => {
    const kind = mediaKind(url)
    if (kind !== 'link') {
      return { url, kind }
    }
    if (content.includes('图片生成完成')) {
      return { url, kind: 'image' }
    }
    if (content.includes('音乐生成完成') || content.includes('语音生成完成')) {
      return { url, kind: 'audio' }
    }
    if (content.includes('视频生成完成')) {
      return { url, kind: 'video' }
    }
    return { url, kind }
  })
}

function mediaDisplayUrl(item: { url: string; kind: string }) {
  return item.kind === 'image' ? mediaPreviewUrls.value[item.url] || item.url : item.url
}

async function preloadMediaPreviews() {
  const imageUrls = messages.value
    .flatMap((message) => mediaItems(message))
    .filter((item) => item.kind === 'image')
    .map((item) => item.url)

  await Promise.all(imageUrls.map((url) => loadMediaPreview(url)))
}

async function loadMediaPreview(url: string) {
  if (
    !url ||
    /^data:/i.test(url) ||
    mediaPreviewUrls.value[url] ||
    mediaPreviewLoading.has(url)
  ) {
    return
  }

  mediaPreviewLoading.add(url)
  try {
    const result = await window.api.fetchUrl(url)
    if (result.success && typeof result.data === 'string' && result.data.startsWith('data:')) {
      mediaPreviewUrls.value = { ...mediaPreviewUrls.value, [url]: normalizeImageDataUrl(result.data) }
    }
  } catch {
    // 保留原始 URL，用户仍可通过“打开/下载”获取文件。
  } finally {
    mediaPreviewLoading.delete(url)
  }
}

function normalizeImageDataUrl(dataUrl: string) {
  return dataUrl.replace(/^data:(application\/octet-stream|binary\/octet-stream);/i, 'data:image/png;')
}

function revokeMediaPreviews() {
  Object.values(mediaPreviewUrls.value).forEach((url) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
  mediaPreviewUrls.value = {}
  mediaPreviewLoading.clear()
}

function messageTextWithoutUrls(message: AiMessage) {
  return String(message.content || '').replace(/https?:\/\/\S+/g, '').trim()
}

function fileNameFromUrl(url: string, kind: string) {
  const extensionByKind: Record<string, string> = {
    image: 'png',
    audio: 'mp3',
    video: 'mp4'
  }
  try {
    const parsed = new URL(url)
    const name = parsed.pathname.split('/').filter(Boolean).pop()
    if (name && name.includes('.')) {
      return decodeURIComponent(name)
    }
  } catch {}
  return `ai-${kind}-${Date.now()}.${extensionByKind[kind] || 'bin'}`
}

async function downloadMedia(url: string, kind: string) {
  const filename = fileNameFromUrl(url, kind)
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('download failed')
    }
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    triggerDownload(blobUrl, filename)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch {
    triggerDownload(url, filename)
  }
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  link.rel = 'noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function stopGenerating() {
  if (currentRequestId.value) {
    await stopAiStream(currentRequestId.value)
  }
  isGenerating.value = false
}

function retryLast() {
  const lastUser = [...messages.value].reverse().find(item => item.role === 'user')
  if (lastUser?.content) {
    prompt.value = lastUser.content
    void sendPrompt()
  }
}

async function copyMessage(message: AiMessage) {
  if (!message.content) return
  await navigator.clipboard?.writeText(message.content)
}

function handleStreamEvent(event: any) {
  if (!event || event.requestId !== currentRequestId.value) {
    return
  }

  const assistant = [...messages.value].reverse().find(item => item.role === 'assistant')

  if (event.type === 'meta' && event.conversation) {
    activeConversationId.value = event.conversation.id
  }

  if (event.type === 'delta' && assistant) {
    assistant.content = `${assistant.content || ''}${event.content || ''}`
    scrollToBottom()
  }

  if (event.type === 'reasoning' && assistant) {
    assistant.reasoningContent = `${assistant.reasoningContent || ''}${event.content || ''}`
    scrollToBottom()
  }

  if (event.type === 'done') {
    isGenerating.value = false
    currentRequestId.value = ''
    selectedTemplateId.value = undefined
    void refreshConversations()
  }

  if (event.type === 'error') {
    isGenerating.value = false
    currentRequestId.value = ''
    error.value = event.error || 'AI 生成失败'
  }

  if (event.type === 'closed' && isGenerating.value) {
    isGenerating.value = false
    currentRequestId.value = ''
  }
}

async function refreshConversations() {
  try {
    conversations.value = await fetchAiConversations()
  } catch {}
}
</script>

<template>
  <section class="ai-workspace" :class="{ 'is-panel-collapsed': isPanelCollapsed }">
    <div v-if="!isLoggedIn" class="ai-login-mask">
      <div>
        <strong>登录后开启智能创作</strong>
        <p>AI 会话、模板使用记录和模型配置需要同步到你的账号。</p>
        <button type="button" @click="requireLogin">立即登录</button>
      </div>
    </div>

    <aside class="conversation-panel">
      <div class="panel-title">
        <strong>开启创作</strong>
        <button
          type="button"
          :title="isPanelCollapsed ? '展开对话记录' : '折叠对话记录'"
          @click="togglePanel"
        >
          {{ isPanelCollapsed ? '›' : '‹' }}
        </button>
      </div>

      <button type="button" class="new-chat" @click="newConversation">
        <span>✎</span>
        <strong>新对话</strong>
      </button>

      <button type="button" class="new-chat subtle" @click="pickCapability('agent')">
        <span>▣</span>
        <strong>默认创作</strong>
      </button>

      <div class="recent-title">最近</div>

      <div class="thread-list">
        <button
          v-for="item in conversations"
          :key="item.id"
          type="button"
          class="conversation-item"
          :class="{ active: activeConversationId === item.id }"
          @click="openConversation(item.id)"
        >
          <span>□</span>
          <strong>{{ truncateText(item.title || '未命名对话', 12) }}</strong>
          <small>{{ item.modelId }}</small>
          <i title="删除" @click.stop="removeConversation(item.id)">×</i>
        </button>
      </div>
    </aside>

    <section class="chat-shell">
      <header class="chat-toolbar">
        <h2 :title="activeConversationTitle">{{ shortActiveConversationTitle }}</h2>
        <div class="chat-filters">
          <span>⌕</span>
          <select v-model="selectedModelId" title="模型">
            <option v-for="model in activeModels" :key="model.modelId" :value="model.modelId">
              {{ model.name }}
            </option>
          </select>
          <select v-if="generationType === 'text'" v-model="mode" title="生成类型">
            <option value="agent">Agent 模式</option>
            <option value="writing">写作助手</option>
          </select>
          <label class="thinking-toggle">
            <input v-model="thinking" type="checkbox" />
            Thinking
          </label>
        </div>
      </header>

      <div ref="messagePane" class="message-pane">
        <div v-if="error" class="ai-error">
          <span>{{ error }}</span>
          <button v-if="messages.length" type="button" @click="retryLast">重试</button>
        </div>

        <div v-if="messages.length" class="message-list">
          <article v-for="message in messages" :key="message.id" :class="['message', message.role]">
            <div v-if="message.role === 'assistant'" class="thinking-state">
              <span v-if="isGenerating && !message.content">认真思考中...</span>
              <span v-else>思考完成</span>
            </div>
            <details v-if="message.reasoningContent" class="reasoning">
              <summary>推理过程</summary>
              <p>{{ message.reasoningContent }}</p>
            </details>
            <div class="message-bubble">
              <p>
                {{
                  messageTextWithoutUrls(message) ||
                  (message.role === 'assistant' && isGenerating ? '生成中...' : '')
                }}
              </p>
              <div v-if="message.role === 'assistant' && mediaItems(message).length" class="media-result">
                <article
                  v-for="item in mediaItems(message)"
                  :key="item.url"
                  :class="['media-card', item.kind]"
                >
                  <img
                    v-if="item.kind === 'image'"
                    :src="mediaDisplayUrl(item)"
                    alt="生成图片"
                    @error="loadMediaPreview(item.url)"
                  />
                  <audio v-else-if="item.kind === 'audio'" :src="item.url" controls />
                  <video v-else-if="item.kind === 'video'" :src="item.url" controls />
                  <a v-else :href="item.url" target="_blank" rel="noreferrer">{{ item.url }}</a>
                  <div class="media-actions">
                    <a :href="item.url" target="_blank" rel="noreferrer">打开</a>
                    <button type="button" @click="downloadMedia(item.url, item.kind)">下载</button>
                  </div>
                </article>
              </div>
              <button
                v-if="message.role === 'assistant' && message.content"
                type="button"
                @click="copyMessage(message)"
              >
                复制
              </button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <div class="empty-copy">
            <span>Agent Workspace</span>
            <strong>今天想创作什么？</strong>
            <p>选择一个模板，或者直接在下方输入需求开始流式对话。</p>
          </div>

          <div class="template-grid">
            <button
              v-for="template in templates"
              :key="template.id"
              type="button"
              class="template-card"
              @click="pickTemplate(template)"
            >
              <span>{{ template.tags?.[0] || '精选' }}</span>
              <strong>{{ template.title }}</strong>
              <small>{{ template.description }}</small>
            </button>
          </div>
        </div>
      </div>

      <section class="composer">
        <button type="button" class="upload-placeholder" title="上传参考">＋</button>
        <div class="composer-main">
          <textarea
            v-model="prompt"
            rows="2"
            :placeholder="
              selectedTemplate
                ? `已选择「${selectedTemplate.title}」，输入你的想法开始创作`
                : '输入想法、脚本或上传参考，支持 / 使用技能、@ 添加主体，和 Agent 一起创作'
            "
            maxlength="8000"
            @keydown.meta.enter.prevent="sendPrompt"
            @keydown.ctrl.enter.prevent="sendPrompt"
          />
          <div class="composer-actions">
            <button
              type="button"
              :class="{ active: generationType === 'text' && mode === 'agent' }"
              @click="pickCapability('agent')"
            >
              Agent 模式
            </button>
            <button
              type="button"
              :class="{ active: generationType === 'text' && mode === 'writing' }"
              @click="pickCapability('writing')"
            >
              写作助手
            </button>
            <button type="button" :class="{ active: generationType === 'image' }" @click="pickCapability('image')">
              图片生成
            </button>
            <button type="button" :class="{ active: generationType === 'audio_music' }" @click="pickCapability('audio')">
              音乐生成
            </button>
            <button type="button" :class="{ active: generationType === 'audio_speech' }" @click="pickSpeechCapability">
              语音生成
            </button>
            <button type="button" :class="{ active: generationType === 'video' }" @click="pickCapability('video')">
              视频生成
            </button>
          </div>
        </div>
        <button
          v-if="!isGenerating"
          type="button"
          class="send-btn"
          :disabled="!canSend"
          title="发送"
          @click="sendPrompt"
        >
          ↑
        </button>
        <button v-else type="button" class="send-btn stop" title="停止" @click="stopGenerating">■</button>
      </section>
    </section>

    <div v-if="isLoading" class="loading-mask">AI 工作台加载中...</div>
  </section>
</template>

<style scoped>
.ai-workspace {
  position: relative;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  overflow: hidden;
  color: #eef8ff;
  background:
    radial-gradient(circle at 58% 28%, rgba(13, 76, 121, 0.2), transparent 30%),
    linear-gradient(180deg, rgba(1, 7, 18, 0.2), rgba(1, 8, 20, 0.5));
  transition: grid-template-columns 0.18s ease;
}

.ai-workspace.is-panel-collapsed {
  grid-template-columns: 68px minmax(0, 1fr);
}

.ai-login-mask,
.loading-mask {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgba(1, 10, 24, 0.78);
  backdrop-filter: blur(8px);
}

.ai-login-mask > div {
  width: min(420px, calc(100% - 32px));
  padding: 28px;
  border: 1px solid rgba(40, 207, 255, 0.42);
  border-radius: 8px;
  background: rgba(5, 24, 50, 0.94);
}

.ai-login-mask strong {
  display: block;
  font-size: 22px;
}

.ai-login-mask p {
  margin: 10px 0 18px;
  color: #9eb4d4;
  line-height: 1.7;
}

button,
select,
textarea,
input {
  font: inherit;
}

button,
select {
  border: 1px solid rgba(87, 116, 157, 0.36);
  border-radius: 8px;
  background: rgba(18, 24, 35, 0.78);
  color: #dff6ff;
}

button {
  cursor: pointer;
}

.conversation-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 18px 16px;
  border-right: 1px solid rgba(83, 111, 147, 0.28);
  background: rgba(6, 10, 18, 0.62);
  overflow: hidden;
}

.panel-title {
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title strong {
  font-size: 15px;
}

.panel-title button {
  width: 30px;
  height: 30px;
  border-color: transparent;
  background: transparent;
  color: #9aa8bc;
  font-size: 20px;
}

.is-panel-collapsed .conversation-panel {
  gap: 10px;
  padding: 18px 12px;
}

.is-panel-collapsed .panel-title {
  justify-content: center;
}

.is-panel-collapsed .panel-title strong,
.is-panel-collapsed .new-chat strong,
.is-panel-collapsed .recent-title,
.is-panel-collapsed .conversation-item strong,
.is-panel-collapsed .conversation-item small,
.is-panel-collapsed .conversation-item i {
  display: none;
}

.is-panel-collapsed .new-chat,
.is-panel-collapsed .conversation-item {
  width: 44px;
  min-height: 44px;
  display: grid;
  grid-template-columns: 1fr;
  justify-items: center;
  padding: 5px;
}

.new-chat {
  width: 100%;
  min-height: 44px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  text-align: left;
  border-color: transparent;
  background: transparent;
}

.new-chat span,
.conversation-item > span {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(88, 114, 150, 0.32);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.05);
  color: #dce8f7;
}

.new-chat.subtle {
  color: #b5bfcc;
}

.recent-title {
  margin-top: 18px;
  color: #6f7a8c;
  font-size: 13px;
}

.thread-list {
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 10px;
}

.conversation-item {
  width: 100%;
  min-height: 56px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 18px;
  grid-template-rows: auto auto;
  gap: 3px 10px;
  align-items: center;
  padding: 8px 10px;
  text-align: left;
  border-color: transparent;
  border-radius: 10px;
  background: transparent;
}

.conversation-item > span {
  grid-row: 1 / span 2;
}

.conversation-item.active {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
}

.conversation-item strong,
.conversation-item small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-item strong {
  align-self: end;
  color: #eef4ff;
  font-size: 14px;
  line-height: 1.2;
}

.conversation-item small {
  grid-column: 2;
  align-self: start;
  color: #737f91;
  font-size: 11px;
  line-height: 1.2;
}

.conversation-item i {
  grid-column: 3;
  grid-row: 1 / span 2;
  align-self: center;
  color: #6f7a8c;
  font-style: normal;
  text-align: center;
  opacity: 0.8;
}

.chat-shell {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  padding: 14px 22px 16px;
}

.chat-toolbar {
  width: min(100%, 1500px);
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  justify-self: center;
}

.chat-toolbar h2 {
  min-width: 0;
  max-width: 46vw;
  flex: 1 1 auto;
  margin: 0;
  overflow: hidden;
  color: #d6d9e0;
  font-size: 18px;
  font-weight: 750;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-filters {
  flex: 0 0 auto;
  min-width: max-content;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(88, 114, 150, 0.24);
  border-radius: 8px;
  background: rgba(19, 24, 34, 0.86);
}

.chat-filters span {
  color: #dce8f7;
}

.chat-filters select {
  max-width: 170px;
  height: 28px;
  border: 0;
  border-left: 1px solid rgba(126, 146, 173, 0.2);
  border-radius: 0;
  background: transparent;
}

.thinking-toggle {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 10px;
  border-left: 1px solid rgba(126, 146, 173, 0.2);
  color: #dce8f7;
  white-space: nowrap;
}

.message-pane {
  min-height: 0;
  overflow: auto;
  padding: 12px min(10vw, 110px) 18px;
}

.ai-error {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0 auto 16px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 92, 92, 0.32);
  border-radius: 8px;
  color: #ffdddd;
  background: rgba(92, 20, 30, 0.42);
}

.message-list {
  width: min(100%, 960px);
  margin: 0 auto;
  display: grid;
  gap: 22px;
}

.message {
  display: grid;
  gap: 10px;
}

.message.user {
  justify-items: end;
}

.message-bubble {
  max-width: min(720px, 86%);
}

.message.user .message-bubble {
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(39, 43, 55, 0.88);
}

.message.assistant .message-bubble {
  max-width: min(780px, 92%);
  color: #d6dce7;
}

.message p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.8;
}

.media-result {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.media-card {
  min-width: 0;
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 1px solid rgba(86, 153, 204, 0.35);
  border-radius: 12px;
  background: rgba(6, 18, 34, 0.72);
  box-shadow: inset 0 0 22px rgba(25, 149, 255, 0.08);
}

.media-card img,
.media-card video {
  width: 100%;
  max-height: 360px;
  border-radius: 9px;
  background: rgba(2, 8, 18, 0.76);
  object-fit: contain;
}

.media-card audio {
  width: 100%;
}

.media-card > a {
  color: #59dfff;
  word-break: break-all;
}

.media-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.media-actions a,
.media-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 54px;
  height: 28px;
  margin: 0;
  padding: 0 10px;
  border: 1px solid rgba(86, 153, 204, 0.45);
  border-radius: 8px;
  background: rgba(13, 28, 48, 0.72);
  color: #9fdfff;
  font-size: 12px;
  line-height: 1;
  text-decoration: none;
}

.message button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  margin: 16px auto 0;
  min-width: 50px;
  height: 28px;
  padding: 0 10px;
  border-color: rgba(86, 153, 204, 0.45);
  border-radius: 9px;
  background: rgba(13, 28, 48, 0.72);
  color: #9fdfff;
  font-size: 12px;
  line-height: 1;
}

.message .media-actions button {
  width: auto;
  min-width: 54px;
  margin: 0;
}

.thinking-state {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #e5ecf8;
  font-weight: 700;
}

.thinking-state::before {
  width: 10px;
  height: 14px;
  content: '';
  border-left: 3px solid #00d7ff;
  border-right: 3px solid transparent;
  transform: skew(-28deg);
}

.reasoning {
  max-width: min(760px, 92%);
  color: #7d889a;
}

.reasoning summary {
  cursor: pointer;
  color: #a8b5c7;
}

.empty-state {
  width: min(100%, 1120px);
  min-height: 100%;
  margin: 0 auto;
  display: grid;
  align-content: center;
  gap: 26px;
}

.empty-copy span {
  display: block;
  color: #18d8f7;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.empty-copy strong {
  display: block;
  margin-top: 8px;
  color: #eef4ff;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.15;
}

.empty-copy p {
  margin: 12px 0 0;
  color: #8793a5;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(190px, 1fr));
  gap: 12px;
}

.template-card {
  min-height: 118px;
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 16px;
  text-align: left;
  border-color: rgba(66, 104, 152, 0.28);
  background:
    linear-gradient(135deg, rgba(8, 41, 70, 0.54), rgba(22, 25, 36, 0.86)),
    rgba(14, 20, 31, 0.86);
}

.template-card span {
  width: max-content;
  padding: 3px 8px;
  border: 1px solid rgba(45, 230, 211, 0.44);
  border-radius: 8px;
  color: #43e8d3;
  font-size: 12px;
}

.template-card strong {
  font-size: 16px;
}

.template-card small {
  color: #9db5d6;
  line-height: 1.5;
}

.composer {
  position: sticky;
  bottom: 0;
  z-index: 3;
  width: min(760px, calc(100% - 32px));
  min-height: 98px;
  justify-self: center;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 40px;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
  padding: 11px 13px;
  border: 1px solid rgba(78, 99, 130, 0.3);
  border-radius: 24px;
  background: rgba(24, 28, 38, 0.94);
  box-shadow:
    0 28px 70px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.upload-placeholder {
  width: 38px;
  height: 48px;
  align-self: center;
  justify-self: center;
  border-color: rgba(113, 129, 154, 0.16);
  border-radius: 6px;
  background:
    linear-gradient(145deg, rgba(79, 88, 107, 0.78), rgba(45, 51, 65, 0.72)),
    rgba(61, 68, 84, 0.62);
  color: #a4adbb;
  font-size: 24px;
  transform: rotate(-8deg);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.22);
}

.composer-main {
  min-width: 0;
  display: grid;
  gap: 9px;
}

.composer textarea {
  width: 100%;
  height: 52px;
  min-height: 52px;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  color: #eef8ff;
  font-size: 14px;
  line-height: 26px;
  overflow: hidden;
}

.composer textarea::placeholder {
  color: #7d8898;
}

.composer-actions {
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.composer-actions::-webkit-scrollbar {
  display: none;
}

.composer-actions button {
  flex: 0 0 auto;
  height: 28px;
  padding: 0 9px;
  color: #d8e1ef;
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
}

.composer-actions .active {
  border-color: rgba(12, 216, 249, 0.55);
  color: #20e7ff;
}

.send-btn {
  width: 36px;
  height: 36px;
  align-self: center;
  border: 0;
  border-radius: 50%;
  background: #eef4ff;
  color: #111722;
  font-size: 22px;
  font-weight: 900;
}

.send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.send-btn.stop {
  background: #eef4ff;
  color: #111722;
  font-size: 18px;
}

@media (max-width: 1100px) {
  .ai-workspace {
    grid-template-columns: 180px minmax(0, 1fr);
  }

  .ai-workspace.is-panel-collapsed {
    grid-template-columns: 68px minmax(0, 1fr);
  }

  .chat-filters {
    max-width: 100%;
    flex-wrap: wrap;
  }

  .chat-toolbar h2 {
    max-width: 38vw;
  }

  .message-pane {
    padding-inline: 24px;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .ai-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .conversation-panel {
    max-height: 150px;
    border-right: 0;
    border-bottom: 1px solid rgba(83, 111, 147, 0.28);
  }

  .thread-list {
    display: flex;
    overflow-x: auto;
  }

  .conversation-item {
    min-width: 190px;
  }

  .chat-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .composer {
    width: 100%;
    grid-template-columns: minmax(0, 1fr) 48px;
  }

  .upload-placeholder {
    display: none;
  }
}
</style>
