export default defineEventHandler(async () => {
  const [metrics, recent, jobs] = await Promise.all([
    api("/api/metrics"),
    api("/api/events/recent?limit=12"),
    api("/api/jobs"),
  ]);
  return { metrics, recent, jobs, at: Date.now() };
});
