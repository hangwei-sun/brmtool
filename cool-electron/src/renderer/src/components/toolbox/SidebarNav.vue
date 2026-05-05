<script setup lang="ts">
export interface ToolboxNavItem {
  code: string
  name: string
  icon: string
  count?: number
}

defineProps<{
  items: ToolboxNavItem[]
  modelValue: string
  collapsed?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <nav class="sidebar-nav" :class="{ collapsed }" aria-label="工具分类">
    <button
      v-for="item in items"
      :key="item.code"
      class="nav-item"
      :class="{ active: modelValue === item.code }"
      type="button"
      :title="collapsed ? item.name : undefined"
      @click="emit('update:modelValue', item.code)"
    >
      <span class="nav-icon">{{ item.icon }}</span>
      <span class="nav-name">{{ item.name }}</span>
      <span v-if="typeof item.count === 'number'" class="nav-count">{{ item.count }}</span>
    </button>
  </nav>
</template>

<style scoped>
.sidebar-nav {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 6px;
  min-height: 0;
  overflow: hidden;
}

.nav-item {
  box-sizing: border-box;
  width: 100%;
  min-height: 42px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #8ea7cd;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.nav-item:hover {
  color: #c8f3ff;
  border-color: rgba(57, 182, 255, 0.32);
  background: rgba(12, 69, 125, 0.35);
}

.nav-item.active {
  color: #ecfbff;
  border-color: rgba(36, 207, 255, 0.72);
  background:
    linear-gradient(90deg, rgba(13, 133, 232, 0.62), rgba(8, 56, 105, 0.4)),
    rgba(11, 31, 62, 0.78);
  box-shadow:
    inset 3px 0 0 #2de2ff,
    0 0 24px rgba(0, 149, 255, 0.2);
}

.nav-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(78, 186, 255, 0.28);
  border-radius: 8px;
  background: rgba(5, 23, 47, 0.74);
  color: #4ee8ff;
  font-size: 14px;
  font-weight: 700;
}

.nav-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 650;
}

.nav-count {
  min-width: 24px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(19, 227, 198, 0.12);
  color: #59f4d8;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

@media (max-width: 900px) {
  .sidebar-nav,
  .sidebar-nav.collapsed {
    align-content: start;
  }
}

.sidebar-nav.collapsed .nav-item {
  grid-template-columns: 1fr;
  justify-items: center;
  min-height: 44px;
  padding: 6px;
}

.sidebar-nav.collapsed .nav-name,
.sidebar-nav.collapsed .nav-count {
  display: none;
}

@media (max-width: 900px) {
  .nav-item {
    grid-template-columns: 1fr;
    justify-items: center;
    min-height: 44px;
    padding: 6px;
  }

  .nav-name,
  .nav-count {
    display: none;
  }
}
</style>
