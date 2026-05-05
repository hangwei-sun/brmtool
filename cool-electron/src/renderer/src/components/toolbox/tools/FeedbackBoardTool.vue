<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  fetchMyFeedback,
  submitFeedback,
  type ToolboxFeedback
} from '../../../services/toolbox'
import './tool-form.css'

const form = reactive({
  title: '',
  content: '',
  contact: ''
})
const list = ref<ToolboxFeedback[]>([])
const loading = ref(false)
const submitting = ref(false)
const message = ref('')
const error = ref('')

onMounted(() => {
  void loadFeedback()
})

async function loadFeedback() {
  loading.value = true
  error.value = ''
  try {
    list.value = await fetchMyFeedback()
  } catch (err) {
    error.value = (err as Error).message || '建议列表加载失败'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!form.title.trim()) {
    error.value = '请输入建议标题'
    return
  }
  if (!form.content.trim()) {
    error.value = '请输入建议内容'
    return
  }

  submitting.value = true
  error.value = ''
  message.value = ''

  try {
    await submitFeedback({
      title: form.title.trim(),
      content: form.content.trim(),
      contact: form.contact.trim()
    })
    form.title = ''
    form.content = ''
    form.contact = ''
    message.value = '建议已提交，感谢你的反馈'
    await loadFeedback()
  } catch (err) {
    error.value = (err as Error).message || '提交失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="feedback-board">
    <form class="tool-panel feedback-form" @submit.prevent="submit">
      <div class="tool-panel-head">
        <div>
          <span>Local Plugin</span>
          <h3>使用建议留言板</h3>
        </div>
        <button type="button" :disabled="loading" @click="loadFeedback">刷新</button>
      </div>

      <label>
        <span>标题</span>
        <input v-model="form.title" maxlength="120" placeholder="例如：希望增加一个批量图片压缩工具" />
      </label>

      <label>
        <span>建议内容</span>
        <textarea
          v-model="form.content"
          maxlength="2000"
          rows="7"
          placeholder="描述你的使用场景、期望效果或遇到的问题"
        />
      </label>

      <label>
        <span>联系方式</span>
        <input v-model="form.contact" maxlength="120" placeholder="可选：微信、邮箱或电话" />
      </label>

      <p v-if="error" class="feedback-error">{{ error }}</p>
      <p v-if="message" class="feedback-success">{{ message }}</p>

      <div class="feedback-actions">
        <button type="submit" :disabled="submitting">{{ submitting ? '提交中' : '提交建议' }}</button>
      </div>
    </form>

    <section class="tool-panel feedback-list">
      <div class="tool-panel-head">
        <div>
          <span>History</span>
          <h3>我的建议记录</h3>
        </div>
        <small>{{ list.length }} 条</small>
      </div>

      <div v-if="list.length" class="feedback-items">
        <article v-for="item in list" :key="item.id" class="feedback-item">
          <div>
            <strong>{{ item.title }}</strong>
            <span :class="{ done: item.status === 1 }">{{ item.status === 1 ? '已处理' : '待处理' }}</span>
          </div>
          <p>{{ item.content }}</p>
          <small>{{ item.createTime || '刚刚提交' }}</small>
          <em v-if="item.reply">处理备注：{{ item.reply }}</em>
        </article>
      </div>

      <div v-else class="feedback-empty">
        {{ loading ? '正在读取建议记录...' : '还没有提交过建议。' }}
      </div>
    </section>
  </div>
</template>

<style scoped>
.feedback-board {
  min-height: 100%;
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(320px, 1fr);
  gap: 14px;
}

.tool-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.tool-panel-head span {
  color: #29e7ff;
  font-size: 12px;
  font-weight: 800;
}

.tool-panel-head h3 {
  margin-top: 4px;
  color: #f2f9ff;
  font-size: 18px;
}

.tool-panel-head button,
.feedback-actions button {
  height: 34px;
  border: 1px solid rgba(39, 190, 255, 0.7);
  border-radius: 8px;
  padding: 0 12px;
  background: linear-gradient(180deg, rgba(14, 114, 223, 0.82), rgba(6, 55, 116, 0.72));
  color: #f5fbff;
  cursor: pointer;
}

.feedback-form {
  display: grid;
  gap: 12px;
}

.feedback-form label {
  display: grid;
  gap: 7px;
  color: #bad4f7;
  font-size: 13px;
}

.feedback-form input,
.feedback-form textarea {
  width: 100%;
  border: 1px solid rgba(91, 172, 235, 0.32);
  border-radius: 8px;
  outline: 0;
  padding: 10px 12px;
  background: rgba(4, 19, 42, 0.78);
  color: #f0fbff;
  resize: vertical;
}

.feedback-actions {
  display: flex;
  justify-content: flex-end;
}

.feedback-error {
  color: #ff9d9d;
  font-size: 13px;
}

.feedback-success {
  color: #6dffd8;
  font-size: 13px;
}

.feedback-list {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.feedback-list small {
  color: #8fa7cc;
}

.feedback-items {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 10px;
  overflow: auto;
}

.feedback-item {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(91, 172, 235, 0.24);
  border-radius: 8px;
  background: rgba(8, 35, 70, 0.72);
}

.feedback-item div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.feedback-item strong {
  color: #eef8ff;
  font-size: 14px;
}

.feedback-item span {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 198, 74, 0.14);
  color: #ffd684;
  font-size: 12px;
}

.feedback-item span.done {
  background: rgba(54, 224, 164, 0.12);
  color: #7affd8;
}

.feedback-item p {
  color: #a8bddb;
  font-size: 13px;
  line-height: 1.6;
}

.feedback-item em {
  color: #73eaff;
  font-size: 12px;
  font-style: normal;
}

.feedback-empty {
  min-height: 220px;
  display: grid;
  place-items: center;
  color: #8fa7cc;
}

@media (max-width: 980px) {
  .feedback-board {
    grid-template-columns: 1fr;
  }
}
</style>
