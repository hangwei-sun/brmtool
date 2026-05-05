<script setup lang="ts">
import type { ToolboxTool } from '../../services/toolbox'

defineProps<{
  tool: ToolboxTool
  favorite: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  toggleFavorite: [id: number]
  open: [id: number]
}>()
</script>

<template>
  <article class="tool-card" :class="{ compact }">
    <button
      class="favorite"
      :class="{ active: favorite }"
      type="button"
      :aria-label="favorite ? '取消收藏' : '收藏工具'"
      :title="favorite ? '取消收藏' : '收藏工具'"
      @click.stop="emit('toggleFavorite', tool.id)"
    >
      {{ favorite ? '★' : '☆' }}
    </button>

    <button class="card-main" type="button" @click="emit('open', tool.id)">
      <span class="tool-icon">{{ tool.icon }}</span>
      <span class="tool-copy">
        <strong>
          {{ tool.name }}
          <span v-if="tool.authRequired" class="lock" title="登录后可用">登录</span>
        </strong>
        <small>{{ tool.description }}</small>
        <span class="tags">
          <span v-for="tag in tool.tags" :key="tag">{{ tag }}</span>
        </span>
      </span>
    </button>
  </article>
</template>

<style scoped>
.tool-card {
  position: relative;
  min-height: 116px;
  border: 1px solid rgba(45, 159, 255, 0.42);
  border-radius: 8px;
  background:
    linear-gradient(138deg, rgba(8, 52, 98, 0.86), rgba(5, 24, 50, 0.9) 66%),
    rgba(5, 20, 42, 0.92);
  box-shadow:
    inset 0 0 34px rgba(0, 153, 255, 0.11),
    0 14px 38px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.tool-card::after {
  content: '';
  position: absolute;
  right: -28px;
  bottom: -28px;
  width: 110px;
  height: 110px;
  border: 1px solid rgba(50, 218, 255, 0.18);
  transform: rotate(45deg);
}

.tool-card:hover {
  border-color: rgba(53, 224, 255, 0.74);
  box-shadow:
    inset 0 0 34px rgba(0, 179, 255, 0.16),
    0 18px 46px rgba(0, 11, 32, 0.28);
}

.card-main {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 116px;
  display: grid;
  grid-template-columns: minmax(54px, 70px) minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  padding: 14px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.tool-icon {
  width: 58px;
  max-width: 100%;
  height: 58px;
  padding: 4px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(53, 218, 255, 0.66);
  border-radius: 8px;
  background:
    linear-gradient(145deg, rgba(14, 129, 207, 0.42), rgba(4, 28, 62, 0.9)),
    rgba(6, 28, 60, 0.95);
  color: #61efff;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.05;
  text-align: center;
  overflow-wrap: anywhere;
  box-shadow:
    inset 0 0 22px rgba(30, 197, 255, 0.22),
    0 0 22px rgba(24, 165, 255, 0.22);
}

.tool-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.tool-copy strong {
  max-width: calc(100% - 32px);
  color: #edf8ff;
  font-size: 15px;
  font-weight: 750;
  line-height: 1.25;
}

.lock {
  display: inline-flex;
  align-items: center;
  height: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border: 1px solid rgba(255, 197, 92, 0.42);
  border-radius: 5px;
  color: #ffd36a;
  font-size: 11px;
  font-weight: 700;
  vertical-align: 1px;
}

.tool-copy small {
  display: -webkit-box;
  min-height: 36px;
  overflow: hidden;
  color: #91a7cc;
  font-size: 13px;
  line-height: 1.4;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tags span {
  max-width: 86px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid rgba(30, 220, 195, 0.3);
  border-radius: 6px;
  background: rgba(19, 227, 198, 0.1);
  color: #45e8cf;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite {
  position: absolute;
  z-index: 2;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(144, 169, 210, 0.48);
  border-radius: 8px;
  padding: 0;
  background: rgba(4, 18, 38, 0.72);
  color: #91a6cb;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 19px;
  font-weight: 800;
  line-height: 28px;
  text-align: center;
  cursor: pointer;
}

.favorite.active {
  color: #ffd36a;
  border-color: rgba(255, 194, 76, 0.5);
  box-shadow: 0 0 18px rgba(255, 189, 54, 0.16);
}

.compact {
  min-height: 74px;
}

.compact .card-main {
  min-height: 74px;
  grid-template-columns: 46px minmax(0, 1fr);
  padding: 10px;
}

.compact .tool-icon {
  width: 42px;
  height: 42px;
  font-size: 17px;
}

.compact .tool-copy small,
.compact .tags {
  display: none;
}

.compact .favorite {
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  font-size: 17px;
  line-height: 26px;
}

@media (max-width: 980px) {
  .card-main {
    grid-template-columns: 58px minmax(0, 1fr);
    padding: 14px;
  }

  .tool-icon {
    width: 52px;
    height: 52px;
    font-size: 19px;
  }
}

@media (max-width: 720px) {
  .tool-card {
    min-height: 112px;
  }

  .card-main {
    min-height: 112px;
    grid-template-columns: 50px minmax(0, 1fr);
    gap: 10px;
    padding: 12px;
  }

  .tool-icon {
    width: 46px;
    height: 46px;
    font-size: 17px;
  }

  .favorite {
    top: 10px;
    right: 10px;
  }
}
</style>
