<script setup lang="ts">
const props = defineProps<{ values: number[] }>();
const path = computed(() => {
  const v = props.values;
  if (v.length < 2) return "";
  const max = Math.max(...v, 1), min = Math.min(...v, 0);
  const span = max - min || 1;
  return v.map((y, i) => `${i === 0 ? "M" : "L"}${(i / (v.length - 1)) * 100},${46 - ((y - min) / span) * 44}`).join(" ");
});
</script>

<template>
  <svg class="spark" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
    <path :d="path" fill="none" stroke="#2563eb" stroke-width="1.5" vector-effect="non-scaling-stroke" />
  </svg>
</template>
