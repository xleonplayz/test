// Server-side client for the dashboard API. The API has no public address; this
// app reaches it over the project network edge web -> api. Set API_URL here.
const base = () => (process.env.API_URL || "http://api:4000").replace(/\/$/, "");

export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  return await $fetch<T>(base() + path, {
    method: (init.method || "GET") as any,
    body: init.body as any,
    timeout: 8000,
  });
}
