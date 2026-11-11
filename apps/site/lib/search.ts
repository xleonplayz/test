// Server-side client for the search API. It has no public address; this site
// reaches it over the project network edge site -> search. Set SEARCH_URL here.
const base = () => (process.env.SEARCH_URL || "http://search:4000").replace(/\/$/, "");

export type Result = { id: string; title: string; section: string; url: string; score: number; snippet: string };

export async function searchApi<T>(path: string): Promise<{ status: number; body: T }> {
  const res = await fetch(base() + path, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  return { status: res.status, body: (await res.json().catch(() => ({ error: `search answered ${res.status}` }))) as T };
}
