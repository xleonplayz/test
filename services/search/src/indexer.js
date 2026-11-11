// Client for the indexer (Rust). It has no public address; the search API
// reaches it over the project network edge search -> indexer.
const base = () => (process.env.INDEXER_URL || "http://indexer:5000").replace(/\/$/, "");

export async function indexer(path) {
  const res = await fetch(base() + path, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw Object.assign(new Error(`indexer answered ${res.status}`), { status: 502 });
  return res.json();
}
