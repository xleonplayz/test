// Client for the aggregation worker (Rust). It has no public address; the API
// reaches it over the project network edge api -> worker.
const base = () => (process.env.WORKER_URL || "http://worker:5000").replace(/\/$/, "");

export async function worker(path, body) {
  const res = await fetch(base() + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `worker answered ${res.status}`);
    err.status = 502;
    throw err;
  }
  return data;
}
