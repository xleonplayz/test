import http from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { AppError } from "./db.mjs";
import { openStore } from "./store.mjs";
import settings from "./settings.json" with { type: "json" };
const files = new Map(
  [
    ["/", "index.html", "text/html"],
    ["/app.css", "app.css", "text/css"],
    ["/ui.js", "ui.js", "text/javascript"],
    ["/app.js", "app.js", "text/javascript"],
  ].map(([route, file, type]) => [
    route,
    { body: readFileSync(new URL("./web/" + file, import.meta.url)), type },
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
      const path = new URL(req.url, host).pathname;
      if (req.method === "GET") {
        if (files.has(path)) {
          const f = files.get(path);
          res.writeHead(200, { "Content-Type": f.type + "; charset=utf-8" });
          res.end(f.body);
          return;
        }
        if (path === "/health") {
          json(200, { ok: true, app: settings.name });
          return;
        }
        if (path === "/api/state") {
          json(200, store.snapshot());
          return;
        }
        if (path === "/api/export") {
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="' + settings.slug + '-export.json"',
          );
          json(200, store.export());
          return;
        }
        if (path === "/api/report.csv") {
          res.writeHead(200, {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="' + settings.slug + '-bericht.csv"',
          });
          res.end(store.csv());
          return;
        }
        if (path === "/api/calendar.ics" && store.calendar) {
          res.writeHead(200, {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="buehne.ics"',
          });
          res.end(store.calendar());
          return;
        }
      }
      if (req.method === "POST" && path === "/api/commands") {
        if (
          req.headers["x-workspace"] !== "1" ||
          (req.headers.origin && req.headers.origin !== (process.env.PUBLIC_ORIGIN ?? host.origin))
        )
          throw new AppError("Fremde Herkunft abgewiesen.", 403);
        if (!req.headers["content-type"]?.startsWith("application/json"))
          throw new AppError("JSON erforderlich.", 415);
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 128000) throw new AppError("Anfrage zu groß.", 413);
          chunks.push(chunk);
        }
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks));
        } catch {
          throw new AppError("Ungültiges JSON.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new AppError("JSON-Objekt erforderlich.");
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
      json(e instanceof AppError ? e.status : 500, {
        error:
          e instanceof AppError
            ? e.message
            : "Die Aktion konnte nicht gespeichert werden.",
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
  const port = Number(process.env.PORT ?? settings.port);
  server.listen(port, process.env.HOST ?? "127.0.0.1", () =>
    console.log(settings.name + ": http://127.0.0.1:" + port),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () =>
      server.close(() => {
        store.close();
        process.exit(0);
      }),
    );
}
