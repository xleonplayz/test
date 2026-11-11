// Synthetic traffic so the dashboard shows something without real clients.
// Turn it off with DEMO_TRAFFIC=off.
export function startDemoTraffic(ingest, everyMs = 2000) {
  let t = 0;
  const timer = setInterval(() => {
    t += 1;
    const now = Date.now();
    const wave = Math.sin(t / 15);
    const events = [];
    const requests = 20 + Math.round(10 * wave + Math.random() * 6);
    for (let i = 0; i < requests; i++) {
      events.push({ metric: "http.latency_ms", value: Math.round(40 + 25 * wave + Math.random() ** 3 * 400), ts: now });
    }
    events.push({ metric: "http.requests", value: requests, ts: now });
    if (Math.random() < 0.35) events.push({ metric: "signups", value: 1, ts: now });
    if (Math.random() < 0.5) events.push({ metric: "orders.revenue_eur", value: Math.round(15 + Math.random() * 120), ts: now });
    events.push({ metric: "queue.depth", value: Math.max(0, Math.round(8 + 6 * wave + Math.random() * 4)), ts: now });
    ingest(events.map((e) => ({ ...e, source: "demo" }))).catch((err) => console.warn("demo traffic:", err.message));
  }, everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
