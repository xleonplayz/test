// Serves the Hono app with plain node:http. No @hono/node-server: the Lily Wasm
// runtime carries node:http but not that adapter, and an app that falls back to
// Node cannot take part in the project network yet.
import http from "node:http";
import { createApp } from "./app.js";

const port = Number(process.env.PORT || 4000);
const app = createApp();

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

http
  .createServer(async (req, res) => {
    try {
      const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
      }
      const url = `http://${req.headers.host || "localhost"}${req.url}`;
      const response = await app.fetch(new Request(url, { method: req.method, headers, body }));
      const out = {};
      response.headers.forEach((v, k) => { out[k] = v; });
      res.writeHead(response.status, out);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
  })
  .listen(port, () => console.log(`shop api listening on ${port}`));
