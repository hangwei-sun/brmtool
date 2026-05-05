<script setup lang="ts">
import type { ToolboxTool } from '../../services/toolbox'
import ExternalWebRunner from './ExternalWebRunner.vue'
import Base64Tool from './tools/Base64Tool.vue'
import FeedbackBoardTool from './tools/FeedbackBoardTool.vue'
import JsonTool from './tools/JsonTool.vue'
import MarkdownTool from './tools/MarkdownTool.vue'
import TextDedupeTool from './tools/TextDedupeTool.vue'
import TimestampTool from './tools/TimestampTool.vue'
import UrlTool from './tools/UrlTool.vue'

defineProps<{
  tool: ToolboxTool
}>()

const emit = defineEmits<{
  back: []
}>()

const toolComponents = {
  'json-format': JsonTool,
  'base64-codec': Base64Tool,
  'url-codec': UrlTool,
  'text-dedupe': TextDedupeTool,
  'markdown-preview': MarkdownTool,
  'timestamp-convert': TimestampTool,
  'feedback-board': FeedbackBoardTool
}
</script>

<template>
  <ExternalWebRunner
    v-if="tool.type === 'external_link' && tool.openMode === 'embedded_webview'"
    :tool="tool"
    @close="emit('back')"
  />

  <section v-else class="runner-shell">
    <header class="runner-head">
      <button type="button" title="返回首页" @click="emit('back')">‹</button>
      <span class="runner-icon">{{ tool.icon }}</span>
      <div>
        <h2>{{ tool.name }}</h2>
        <p>{{ tool.description }}</p>
      </div>
    </header>

    <component
      :is="toolComponents[tool.code as keyof typeof toolComponents]"
      v-if="tool.code in toolComponents"
    />

    <div v-else class="unsupported">
      <strong>这个内置工具还没有实现</strong>
      <span>当前工具编码：{{ tool.code }}</span>
    </div>
  </section>
</template>

<style scoped>
.runner-shell {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  overflow: auto;
}

.runner-head {
  min-height: 84px;
  display: grid;
  grid-template-columns: 42px 58px 1fr;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border: 1px solid rgba(44, 164, 244, 0.42);
  border-radius: 8px;
  background: rgba(5, 24, 50, 0.82);
}

.runner-head button {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(66, 185, 245, 0.48);
  border-radius: 8px;
  background: rgba(6, 35, 75, 0.84);
  color: #dffaff;
  font-size: 28px;
  cursor: pointer;
}

.runner-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(53, 218, 255, 0.58);
  border-radius: 8px;
  background: rgba(9, 51, 100, 0.8);
  color: #61efff;
  font-weight: 800;
}

.runner-head h2 {
  color: #f1f8ff;
  font-size: 21px;
  font-weight: 760;
}

.runner-head p {
  color: #8fa7cc;
  font-size: 13px;
}

.unsupported {
  min-height: 320px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px solid rgba(44, 164, 244, 0.36);
  border-radius: 8px;
  background: rgba(5, 23, 49, 0.74);
  color: #90a8cc;
}

.unsupported strong {
  color: #e8f7ff;
  font-size: 18px;
  font-weight: 760;
}
</style>
