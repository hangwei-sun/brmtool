<script setup lang="ts">
import { computed, ref } from 'vue'

const input = ref('{"name":"数智工具箱","tools":["JSON","Base64","URL"],"enabled":true}')
const error = ref('')

const parsed = computed(() => {
  try {
    error.value = ''
    return JSON.parse(input.value)
  } catch (err) {
    error.value = (err as Error).message
    return null
  }
})

const output = computed(() => (parsed.value ? JSON.stringify(parsed.value, null, 2) : ''))

function formatJson() {
  if (parsed.value) input.value = JSON.stringify(parsed.value, null, 2)
}

function compactJson() {
  if (parsed.value) input.value = JSON.stringify(parsed.value)
}

async function copyOutput() {
  if (output.value) await navigator.clipboard?.writeText(output.value)
}
</script>

<template>
  <div class="tool-workbench">
    <section class="tool-pane">
      <div class="pane-head">
        <strong>输入 JSON</strong>
        <div>
          <button type="button" @click="formatJson">格式化</button>
          <button type="button" @click="compactJson">压缩</button>
        </div>
      </div>
      <textarea v-model="input" spellcheck="false" />
    </section>

    <section class="tool-pane">
      <div class="pane-head">
        <strong>输出</strong>
        <button type="button" @click="copyOutput">复制</button>
      </div>
      <pre v-if="!error">{{ output }}</pre>
      <p v-else class="error">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped src="./tool-form.css"></style>
