<script setup lang="ts">
import { computed, ref } from 'vue'

const input = ref('apple\nbanana\napple\norange\nbanana')
const trimLine = ref(true)
const ignoreEmpty = ref(true)

const lines = computed(() => {
  const seen = new Set<string>()
  return input.value
    .split(/\r?\n/)
    .map((line) => (trimLine.value ? line.trim() : line))
    .filter((line) => (ignoreEmpty.value ? line.length > 0 : true))
    .filter((line) => {
      if (seen.has(line)) return false
      seen.add(line)
      return true
    })
})

const output = computed(() => lines.value.join('\n'))
</script>

<template>
  <div class="tool-workbench">
    <section class="tool-pane">
      <div class="pane-head">
        <strong>原始文本</strong>
        <div class="checks">
          <label><input v-model="trimLine" type="checkbox" /> 去首尾空格</label>
          <label><input v-model="ignoreEmpty" type="checkbox" /> 忽略空行</label>
        </div>
      </div>
      <textarea v-model="input" />
    </section>
    <section class="tool-pane">
      <div class="pane-head">
        <strong>去重结果</strong>
        <span>{{ lines.length }} 行</span>
      </div>
      <pre>{{ output }}</pre>
    </section>
  </div>
</template>

<style scoped src="./tool-form.css"></style>
