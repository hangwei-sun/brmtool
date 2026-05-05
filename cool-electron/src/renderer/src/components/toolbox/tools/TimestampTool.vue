<script setup lang="ts">
import { computed, ref } from 'vue'

const now = Date.now()
const timestamp = ref(String(Math.floor(now / 1000)))
const dateTime = ref(new Date(now).toISOString().slice(0, 19))

const parsedDate = computed(() => {
  const value = Number(timestamp.value)
  const milliseconds = timestamp.value.length >= 13 ? value : value * 1000
  const date = new Date(milliseconds)
  return Number.isNaN(date.getTime()) ? '无法识别的时间戳' : date.toLocaleString()
})

const parsedTimestamp = computed(() => {
  const date = new Date(dateTime.value)
  return Number.isNaN(date.getTime())
    ? '无法识别的日期时间'
    : `${Math.floor(date.getTime() / 1000)} 秒 / ${date.getTime()} 毫秒`
})

function useCurrentTime() {
  const current = Date.now()
  timestamp.value = String(Math.floor(current / 1000))
  dateTime.value = new Date(current).toISOString().slice(0, 19)
}
</script>

<template>
  <div class="timestamp-tool">
    <section class="tool-pane">
      <div class="pane-head">
        <strong>时间戳转日期</strong>
        <button type="button" @click="useCurrentTime">当前时间</button>
      </div>
      <input v-model="timestamp" />
      <pre>{{ parsedDate }}</pre>
    </section>
    <section class="tool-pane">
      <div class="pane-head"><strong>日期转时间戳</strong></div>
      <input v-model="dateTime" type="datetime-local" />
      <pre>{{ parsedTimestamp }}</pre>
    </section>
  </div>
</template>

<style scoped src="./tool-form.css"></style>
<style scoped>
.timestamp-tool {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

input {
  width: calc(100% - 28px);
  height: 42px;
  margin: 0 14px 14px;
  padding: 0 12px;
  border: 1px solid rgba(66, 185, 245, 0.34);
  border-radius: 8px;
  outline: 0;
  background: rgba(2, 16, 34, 0.72);
  color: #eaf8ff;
}

@media (max-width: 900px) {
  .timestamp-tool {
    grid-template-columns: 1fr;
  }
}
</style>
