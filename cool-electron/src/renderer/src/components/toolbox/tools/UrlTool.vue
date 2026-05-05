<script setup lang="ts">
import { ref } from 'vue'

const input = ref('https://example.com/search?q=数智工具箱&from=desktop')
const output = ref('')
const error = ref('')

function encode() {
  error.value = ''
  output.value = encodeURIComponent(input.value)
}

function decode() {
  try {
    error.value = ''
    output.value = decodeURIComponent(input.value)
  } catch (err) {
    error.value = 'URL 内容无法解码：' + (err as Error).message
  }
}
</script>

<template>
  <div class="tool-workbench">
    <section class="tool-pane">
      <div class="pane-head">
        <strong>输入 URL / 参数</strong>
        <div>
          <button type="button" @click="encode">编码</button>
          <button type="button" @click="decode">解码</button>
        </div>
      </div>
      <textarea v-model="input" />
    </section>
    <section class="tool-pane">
      <div class="pane-head"><strong>结果</strong></div>
      <pre v-if="!error">{{ output }}</pre>
      <p v-else class="error">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped src="./tool-form.css"></style>
