<script setup lang="ts">
import { ref } from 'vue'

const input = ref('数智工具箱')
const output = ref('')
const error = ref('')

function encode() {
  try {
    error.value = ''
    const bytes = new TextEncoder().encode(input.value)
    output.value = btoa(String.fromCharCode(...bytes))
  } catch (err) {
    error.value = (err as Error).message
  }
}

function decode() {
  try {
    error.value = ''
    const binary = atob(input.value.trim())
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    output.value = new TextDecoder().decode(bytes)
  } catch (err) {
    error.value = 'Base64 内容无法解码：' + (err as Error).message
  }
}
</script>

<template>
  <div class="tool-workbench">
    <section class="tool-pane">
      <div class="pane-head">
        <strong>输入</strong>
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
