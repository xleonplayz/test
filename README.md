# Pulse: a metrics dashboard with a background worker

A dashboard in three apps: Nuxt renders it, an Express API takes events in,
and a Rust worker aggregates them in a background job.

```
browser ──► web (Nuxt 3) ──► api (Express, :4000) ──► worker (Rust/axum, :5000)
                               │
                               └─► PostgreSQL (optional, DATABASE_URL)
```

| App | Path | What it does | Reachable |
|---|---|---|---|
| `web` | `apps/web/` | Nuxt 3 dashboard: metric cards, sparklines, recent events, worker job runs; refreshes every 5 s | public |
| `api` | `services/api/` | Express: ingests events, stores the raw events, forwards them to the worker, serves summaries; sends demo traffic | private, port 4000 |
| `worker` | `services/worker/` | Rust: queues events, folds them every 2 s into one-minute buckets (count, sum, min, max, p50, p95), keeps two hours | private, port 5000 |

## Configuration

| App | Variable | Default | Meaning |
|---|---|---|---|
| `web` | `API_URL` | `http://api:4000` | where the API answers |
| `api` | `WORKER_URL` | `http://worker:5000` | where the worker answers |
| `api` | `DATABASE_URL` | unset | PostgreSQL for the raw events; memory when unset |
| `api` | `DEMO_TRAFFIC` | on | `off` stops the synthetic events |
| `worker` | `AGG_INTERVAL_MS` | `2000` | how often the aggregation job runs |

Edges: `web → api:4000`, `api → worker:5000`. Only `web` is exposed.

### Database

Without `DATABASE_URL` the API keeps the newest 5000 raw events in memory. With
it, the API creates an `events` table on start and stores every event there
(tested against PostgreSQL 16). The aggregates stay in the worker either way.

## API

- `POST /api/events` — one event `{"metric","value","ts?"}`, an array, or `{"events":[…]}`
- `GET /api/metrics` — per-metric totals for the last 5 and 60 minutes
- `GET /api/metrics/{name}/series?minutes=30` — one-minute buckets
- `GET /api/events/recent`, `GET /api/jobs`, `POST /api/jobs/run`
- `GET /health`, `GET /health/deep` (includes the worker)

## Run locally

```
(cd services/worker && cargo run --release)                                   # :5000
(cd services/api && npm ci && WORKER_URL=http://localhost:5000 npm start)     # :4000
(cd apps/web && npm ci && npm run build && PORT=3000 API_URL=http://localhost:4000 npm start)
WEB_URL=http://localhost:3000 API_URL=http://localhost:4000 WORKER_URL=http://localhost:5000 ./smoke.sh
```

## Tests

- `cd services/worker && cargo test` — bucketing, retention, percentiles
- `cd services/api && npm test` — the event store
- `./smoke.sh` — every app and every edge, including one background aggregation round
