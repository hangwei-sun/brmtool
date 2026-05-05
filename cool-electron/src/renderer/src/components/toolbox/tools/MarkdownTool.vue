<script setup lang="ts">
import { computed, ref } from 'vue'

const input = ref('# 数智工具箱\n\n- JSON 格式化\n- Base64 编解码\n\n**目标**：让常用工具更好找、更好用。')

const preview = computed(() => {
  const escaped = input.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^\- (.*)$/gm, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
})
</script>

<template>
  <div class="tool-workbench">
    <section class="tool-pane">
      <div class="pane-head"><strong>Markdown</strong></div>
      <textarea v-model="input" />
    </section>
    <section class="tool-pane">
      <div class="pane-head"><strong>实时预览</strong></div>
      <article class="markdown-preview" v-html="`<p>${preview}</p>`" />
    </section>
  </div>
</template>

<style scoped src="./tool-form.css"></style>
<style scoped>
.markdown-preview {
  height: 100%;
  overflow: auto;
  padding: 16px;
  color: #dbeeff;
  font-size: 14px;
  line-height: 1.75;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3) {
  margin: 0 0 12px;
  color: #f2fbff;
  font-weight: 780;
}

.markdown-preview :deep(ul) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-preview :deep(code) {
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(32, 214, 255, 0.12);
  color: #60f2ff;
}
</style>
