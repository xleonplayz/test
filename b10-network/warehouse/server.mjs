import http from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { openStore, AppError } from "./store.mjs";
const files = new Map(
  [
    ["/", ["text/html", "index.html"]],
    ["/app.css", ["text/css", "app.css"]],
    ["/app.js", ["text/javascript", "app.js"]],
  ].map(([url, [type, name]]) => [
    url,
    [type, readFileSync(new URL("./web/" + name, import.meta.url))],
  ]),
);
export function createApp(dataDir, { seed = true } = {}) {
  const store = openStore(dataDir, { seed });
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    const json = (status, value) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(value));
    };
    try {
      const host = new URL((req.headers["x-forwarded-proto"] === "https" ? "https://" : "http://") + req.headers.host);
      if (process.env.ALLOWED_HOSTS && !process.env.ALLOWED_HOSTS.split(",").includes(host.hostname))
        throw new AppError("Host nicht zugelassen.", 403);
      const url = new URL(req.url, host);
      if (req.method === "GET") {
        if (files.has(url.pathname)) {
          const [type, body] = files.get(url.pathname);
          res.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
          res.end(body);
          return;
        }
        if (url.pathname === "/health") {
          json(200, { ok: true });
          return;
        }
        if (url.pathname === "/api/state") {
          json(200, store.snapshot());
          return;
        }
        if (url.pathname === "/api/export") {
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="depot-export.json"',
          );
          json(200, store.export());
          return;
        }
        if (url.pathname === "/api/inventory.csv") {
          res.writeHead(200, {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="depot-bestand.csv"',
          });
          res.end(store.csv());
          return;
        }
      }
      if (req.method === "POST" && url.pathname === "/api/commands") {
        if (
          req.headers["x-depot"] !== "1" ||
          (req.headers.origin && req.headers.origin !== (process.env.PUBLIC_ORIGIN ?? host.origin))
        )
          throw new AppError("Fremde Herkunft abgewiesen.", 403);
        if (!req.headers["content-type"]?.startsWith("application/json"))
          throw new AppError("JSON erwartet.", 415);
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 64000) throw new AppError("Anfrage zu groß.", 413);
          chunks.push(chunk);
        }
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks));
        } catch {
          throw new AppError("Ungültiges JSON.");
        }
        json(200, store.command(body.revision, body.action));
        return;
      }
      json(404, { error: "Nicht gefunden." });
    } catch (e) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (!(e instanceof AppError)) console.error(e);
      json(e.status ?? 500, {
        error:
          e instanceof AppError
            ? e.message
            : "Daten konnten nicht gespeichert werden.",
      });
    }
  });
  return { server, store };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { server, store } = createApp(
    process.env.APP_DATA_DIR ?? resolve("data"),
  );
  const port = Number(process.env.PORT ?? 4401);
  server.listen(port, process.env.HOST ?? "127.0.0.1", () =>
    console.log("Depot: http://127.0.0.1:" + port),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () =>
      server.close(() => {
        store.close();
        process.exit(0);
      }),
    );
}
