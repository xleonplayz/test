import { Hono } from "hono";
import { indexer } from "./indexer.js";
import { search, suggest } from "./rank.js";

// The index is loaded from the indexer on the first request and refreshed every
// minute; a failed refresh keeps the last good index.
let index = null;
let loadedAt = 0;
let loading = null;
const startedAt = Date.now();

async function currentIndex() {
  if (index && Date.now() - loadedAt < 60_000) return index;
  loading ??= indexer("/index")
    .then((i) => { index = i; loadedAt = Date.now(); return i; })
    .catch((e) => { if (index) return index; throw e; })
    .finally(() => { loading = null; });
  return loading;
}

export function createApp() {
  const app = new Hono();
  app.onError((err, c) => c.json({ error: err.message }, err.status || 500));
  app.use("*", async (c, next) => { await next(); c.header("access-control-allow-origin", "*"); });

  app.get("/health", (c) => c.json({
    ok: true, service: "search", lang: "node", docs: index?.docs.length ?? null,
    indexAgeS: index ? Math.round((Date.now() - loadedAt) / 1000) : null,
    uptimeS: Math.round((Date.now() - startedAt) / 1000),
  }));
  app.get("/health/deep", async (c) => c.json({ ok: true, service: "search", indexer: await indexer("/health") }));

  app.get("/search", async (c) => {
    const q = (c.req.query("q") || "").slice(0, 200);
    const limit = Math.min(Number(c.req.query("limit")) || 10, 25);
    const t0 = performance.now();
    const results = search(await currentIndex(), q, limit);
    return c.json({ q, count: results.length, ms: Math.round((performance.now() - t0) * 100) / 100, results });
  });
  app.get("/suggest", async (c) => c.json({ terms: suggest(await currentIndex(), c.req.query("prefix") || "") }));
  app.get("/docs", async (c) => {
    const i = await currentIndex();
    return c.json({ docs: i.docs.map(({ id, title, section, url, summary }) => ({ id, title, section, url, summary })) });
  });
  app.notFound((c) => c.json({ error: "not found" }, 404));
  return app;
}
