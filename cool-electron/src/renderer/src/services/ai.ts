import { getStoredSession } from './auth'

export interface AiModel {
  id: number
  provider: string
  capability: 'text' | 'image' | 'audio_music' | 'audio_speech' | 'video'
  modelId: string
  name: string
  description?: string
  isDefault?: number
  thinkingDefault?: number
  sort?: number
}

export interface AiGeneration {
  id: number
  type: 'image' | 'audio_music' | 'audio_speech' | 'video'
  provider: string
  modelId: string
  prompt: string
  status: 'processing' | 'succeeded' | 'failed'
  taskId?: string
  outputUrls?: string[]
  errorMessage?: string
  createTime?: string
}

export interface AiTemplate {
  id: number
  title: string
  category: string
  description?: string
  cover?: string
  prompt: string
  tags?: string[]
  useCount?: number
  sort?: number
}

export interface AiConversation {
  id: number
  title: string
  modelId: string
  thinking: number
  mode: string
  lastMessage?: string
  lastMessageTime?: string
  updateTime?: string
}

export interface AiMessage {
  id: number
  conversationId: number
  role: 'user' | 'assistant'
  content?: string
  reasoningContent?: string
  modelId?: string
  status?: number
  errorMessage?: string
  createTime?: string
}

interface ApiEnvelope<T> {
  code?: number
  message?: string
  data?: T
}

export async function fetchAiModels() {
  const data = await appRequest<{ list: AiModel[] }>('/app/ai/models')
  return data.list || []
}

export async function fetchAiTemplates() {
  const data = await appRequest<{ list: AiTemplate[] }>('/app/ai/templates')
  return data.list || []
}

export async function fetchAiConversations() {
  const data = await appRequest<{ list: AiConversation[] }>('/app/ai/conversations?page=1&size=50')
  return data.list || []
}

export async function fetchAiConversation(id: number) {
  return await appRequest<{ conversation: AiConversation; messages: AiMessage[] }>(
    `/app/ai/conversations/${id}`
  )
}

export async function deleteAiConversation(id: number) {
  return await appRequest<{ deleted: boolean }>('/app/ai/conversations/delete', 'POST', { id })
}

export async function generateAiMedia(payload: {
  type: AiGeneration['type']
  prompt: string
  modelId?: string
  conversationId?: number
}) {
  return await appRequest<{
    generation: AiGeneration
    conversation?: AiConversation
    message?: AiMessage
  }>('/app/ai/generate', 'POST', payload)
}

export async function syncAiGeneration(id: number) {
  const data = await appRequest<{ generation: AiGeneration }>('/app/ai/generations/sync', 'POST', { id })
  return data.generation
}

export async function startAiStream(payload: {
  requestId: string
  conversationId?: number
  content: string
  modelId: string
  thinking: boolean
  mode: string
  templateId?: number
}) {
  const session = await getStoredSession()
  return await window.api.startAiStream({
    requestId: payload.requestId,
    path: '/app/ai/chat/stream',
    method: 'POST',
    token: session.token,
    data: {
      conversationId: payload.conversationId,
      content: payload.content,
      modelId: payload.modelId,
      thinking: payload.thinking,
      mode: payload.mode,
      templateId: payload.templateId
    }
  })
}

export async function stopAiStream(requestId: string) {
  return await window.api.stopAiStream(requestId)
}

async function appRequest<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown) {
  const session = await getStoredSession()
  const result = await window.api.appRequest({ path, method, data, token: session.token })
  if (!result.success) {
    throw new Error(result.error || 'AI 接口请求失败')
  }

  const envelope = result.data as ApiEnvelope<T>
  if (typeof envelope?.code === 'number' && envelope.code !== 1000) {
    throw new Error(envelope.message || 'AI 接口返回异常')
  }

  return envelope.data as T
}
