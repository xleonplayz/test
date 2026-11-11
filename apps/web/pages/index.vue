<script setup lang="ts">
type Totals = { count: number; sum: number; avg: number; max: number };
type Summary = { metric: string; last5m: Totals; last60m: Totals };

const { data, refresh, error } = await useFetch<any>("/api/overview");
const { data: health } = await useFetch<any>("/api/health");
const series = ref<Record<string, number[]>>({});

async function loadSeries() {
  const names: string[] = (data.value?.metrics?.metrics || []).map((m: Summary) => m.metric);
  const entries = await Promise.all(
    names.map(async (n) => {
      const s: any = await $fetch(`/api/series/${encodeURIComponent(n)}?minutes=30`);
      return [n, s.points.map((p: any) => (n.endsWith("latency_ms") ? p.p95 : p.sum))] as const;
    }),
  );
  series.value = Object.fromEntries(entries);
}

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  loadSeries();
  timer = setInterval(async () => { await refresh(); loadSeries(); }, 5000);
});
onBeforeUnmount(() => clearInterval(timer));

const fmt = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString("en", { maximumFractionDigits: 0 }) : n.toLocaleString("en", { maximumFractionDigits: 1 }));
const headline = (m: Summary) => (m.metric.endsWith("latency_ms") ? `${fmt(m.last5m.avg)} ms avg` : fmt(m.last5m.sum));

async function sendEvent() {
  await $fetch("/api/events", { method: "POST", body: { metric: "button.clicks", value: 1 } });
  await $fetch("/api/overview"); // the worker folds it within its interval
  setTimeout(() => refresh(), 2500);
}
</script>

<template>
  <header>
    <div>
      <h1>Pulse</h1>
      <div class="muted">Metrics aggregated by a Rust worker, served by an Express API, rendered by Nuxt.</div>
    </div>
    <div class="muted">
      chain web → api → worker:
      <span v-if="health?.ok" class="ok">ok ({{ health.ms }} ms, store {{ health.chain?.store }})</span>
      <span v-else class="bad">broken</span>
    </div>
  </header>

  <p v-if="error" class="bad">The API is not reachable: {{ error.message }}</p>

  <div class="grid">
    <div v-for="m in data?.metrics?.metrics || []" :key="m.metric" class="card">
      <div class="metric">{{ m.metric }}</div>
      <div class="big">{{ headline(m) }}</div>
      <div class="muted">last 5 min · {{ m.last5m.count }} events · 60 min sum {{ fmt(m.last60m.sum) }}</div>
      <Sparkline :values="series[m.metric] || []" />
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Recent events</h3>
      <table>
        <tr v-for="(e, i) in data?.recent?.items || []" :key="i">
          <td class="metric">{{ e.metric }}</td><td class="num">{{ fmt(e.value) }}</td><td class="muted">{{ e.source }}</td>
        </tr>
      </table>
    </div>
    <div class="card">
      <h3>Worker job runs</h3>
      <table>
        <tr v-for="r in (data?.jobs?.runs || []).slice(0, 8)" :key="r.run">
          <td>#{{ r.run }}</td><td class="num">{{ r.events }} events</td><td class="num">{{ r.micros }} µs</td>
        </tr>
      </table>
      <p><button @click="sendEvent">Send a test event</button></p>
    </div>
  </div>
  <p class="muted">Total events aggregated: {{ data?.metrics?.totalEvents ?? 0 }}</p>
</template>
