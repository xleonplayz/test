# Two Apps

A small Next.js frontend and a separate backend app that talk to each other.

```
Browser ──▶ apps/web  (Next.js)  ──BACKEND_URL──▶  services/backend  (Rust)
             /api/backend                           GET /quote?i=<n>
```

| Path | What | Port |
|---|---|---|
| `apps/web` | Next.js 14: counter, notes, quote card | 3000 |
| `services/backend` | Rust, no dependencies: `/health`, `/quote` | 8081 |

## Without a backend nothing breaks

The browser only talks to the frontend's own route `/api/backend`. That
route asks the backend on the server and **always** answers with status
200: either a quote from the backend or `{"source":"local"}`. The page then
shows one of its built-in quotes and the small label says "built in"
instead of "from the backend app". No error message, no red box, no broken
page. Counter and notes never need the backend at all.

## Running locally

```bash
# backend
cd services/backend && cargo run --release -- --serve      # :8081

# frontend
cd apps/web && npm install
BACKEND_URL=http://localhost:8081 npm run dev               # :3000
```

Or both at once: `docker compose up`.

## On the platform

Deploy both directories as two apps. In the frontend app, set
`BACKEND_URL` to the address the backend app received. If it is missing or
wrong, the frontend simply runs on its own.

The backend reads one raw HTTP request from stdin and writes its JSON
answer to stdout (that is how the platform starts it per request);
`--serve` is only for local development.
