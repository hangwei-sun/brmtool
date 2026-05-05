<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  label: string
  trend?: string
}>()
</script>

<template>
  <section class="metric-panel">
    <div class="radar" aria-hidden="true">
      <span />
    </div>
    <div class="metric-copy">
      <p>{{ title }}</p>
      <strong>{{ value }}</strong>
      <small>
        {{ label }}
        <em v-if="trend">{{ trend }}</em>
      </small>
    </div>
  </section>
</template>

<style scoped>
.metric-panel {
  min-height: 126px;
  display: grid;
  grid-template-columns: 84px 1fr;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid rgba(43, 167, 255, 0.34);
  border-radius: 8px;
  background:
    linear-gradient(145deg, rgba(7, 42, 82, 0.92), rgba(4, 21, 44, 0.86)),
    rgba(5, 20, 43, 0.9);
  box-shadow: inset 0 0 28px rgba(0, 148, 255, 0.12);
}

.radar {
  position: relative;
  width: 76px;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    linear-gradient(90deg, transparent 49%, rgba(50, 223, 255, 0.46) 50%, transparent 51%),
    linear-gradient(0deg, transparent 49%, rgba(50, 223, 255, 0.34) 50%, transparent 51%),
    repeating-radial-gradient(
      circle,
      rgba(44, 207, 255, 0.12) 0 8px,
      rgba(44, 207, 255, 0.34) 9px 10px
    );
  overflow: hidden;
}

.radar::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(37, 241, 214, 0.48);
  border-radius: 50%;
}

.radar span {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22f2d0;
  box-shadow: 0 0 18px #22f2d0;
  transform: translate(-50%, -50%);
}

.metric-copy p {
  color: #8ca6cc;
  font-size: 13px;
}

.metric-copy strong {
  display: block;
  margin-top: 2px;
  color: #dffaff;
  font-size: 26px;
  font-weight: 750;
  line-height: 1.15;
}

.metric-copy small {
  display: block;
  margin-top: 5px;
  color: #8fa6c9;
  font-size: 12px;
}

.metric-copy em {
  margin-left: 4px;
  color: #31f0c8;
  font-style: normal;
  font-weight: 700;
}
</style>
