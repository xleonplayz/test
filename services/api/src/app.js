import express from "express";
import { worker } from "./worker.js";

const startedAt = Date.now();

function validEvent(e) {
  return e && typeof e.metric === "string" && /^[\w.:-]{1,64}$/.test(e.metric) && Number.isFinite(Number(e.value));
}

export function createApp(store) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "512kb" }));
  app.use((req, res, next) => {
    res.set("access-control-allow-origin", "*");
    res.set("access-control-allow-headers", "content-type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // Stores raw events and hands them to the worker for aggregation.
  async function ingest(list) {
    const events = list.map((e) => ({ metric: e.metric, value: Number(e.value), ts: Number(e.ts) || Date.now(), source: e.source || "api" }));
    await store.append(events);
    return worker("/ingest", { events: events.map(({ metric, value, ts }) => ({ metric, value, ts })) });
  }
  app.locals.ingest = ingest;

  app.get("/health", async (req, res) => {
    res.json({ ok: true, service: "api", lang: "node", store: store.kind, events: await store.count(), uptimeS: Math.round((Date.now() - startedAt) / 1000) });
  });

  app.get("/health/deep", async (req, res, next) => {
    try {
      res.json({ ok: true, service: "api", store: store.kind, worker: await worker("/health") });
    } catch (e) { next(e); }
  });

  app.post("/api/events", async (req, res, next) => {
    try {
      const list = Array.isArray(req.body) ? req.body : Array.isArray(req.body?.events) ? req.body.events : [req.body];
      const bad = list.filter((e) => !validEvent(e)).length;
      if (bad || list.length === 0) return res.status(400).json({ error: `${bad || "no"} invalid events; expected {metric, value, ts?}` });
      if (list.length > 1000) return res.status(413).json({ error: "at most 1000 events per call" });
      const r = await ingest(list);
      res.status(202).json({ stored: list.length, worker: r });
    } catch (e) { next(e); }
  });

  app.get("/api/events/recent", async (req, res, next) => {
    try {
      res.json({ items: await store.recent(Math.min(Number(req.query.limit) || 25, 200)) });
    } catch (e) { next(e); }
  });

  app.get("/api/metrics", async (req, res, next) => {
    try { res.json(await worker("/summary")); } catch (e) { next(e); }
  });

  app.get("/api/metrics/:name/series", async (req, res, next) => {
    try {
      const q = new URLSearchParams({ metric: req.params.name, minutes: String(Number(req.query.minutes) || 30) });
      res.json(await worker(`/series?${q}`));
    } catch (e) { next(e); }
  });

  app.get("/api/jobs", async (req, res, next) => {
    try { res.json(await worker("/jobs")); } catch (e) { next(e); }
  });

  app.post("/api/jobs/run", async (req, res, next) => {
    try { res.json(await worker("/jobs/run", {})); } catch (e) { next(e); }
  });

  app.use((req, res) => res.status(404).json({ error: "not found" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}
