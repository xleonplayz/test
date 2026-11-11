# Leaf & Kettle: a tea shop from three apps

A small online shop split into three apps that talk over a private project
network. The storefront is the only public app.

```
browser ──► web (Next.js) ──► api (Hono, :4000) ──► pricing (Rust/axum, :5000)
```

| App | Path | What it does | Reachable |
|---|---|---|---|
| `web` | `apps/web/` | Next.js 15 storefront: catalog, product pages, cart, checkout, status page | public |
| `api` | `services/api/` | Hono (served with node:http): catalog, carts and orders (in memory) | private, port 4000 |
| `pricing` | `services/pricing/` | Rust (axum): volume discounts, promo codes, VAT per country and category, shipping | private, port 5000 |

The storefront's browser code never calls the API directly; Next.js route
handlers under `app/api/` forward to it, and the cart id lives in an http-only
cookie.

## Configuration

| App | Variable | Default | Meaning |
|---|---|---|---|
| `web` | `API_URL` | `http://api:4000` | where the API answers |
| `api` | `PRICING_URL` | `http://pricing:5000` | where the pricing service answers |
| all | `PORT` | 3000 / 4000 / 5000 | listen port |

Edges: `web → api:4000`, `api → pricing:5000`. Only `web` is exposed.

Promo codes: `WELCOME10` (10 %), `TEA20` (20 %). Shipping countries: DE, AT, FR, NL, CH.

## Run locally

```
(cd services/pricing && cargo run --release)                       # :5000
(cd services/api && npm ci && PRICING_URL=http://localhost:5000 npm start)   # :4000
(cd apps/web && npm ci && npm run build && API_URL=http://localhost:4000 npm start)   # :3000
WEB_URL=http://localhost:3000 API_URL=http://localhost:4000 PRICING_URL=http://localhost:5000 ./smoke.sh
```

## Tests

- `cd services/pricing && cargo test` — pricing rules
- `./smoke.sh` — every app and every edge, end to end. Against a deployment only
  `WEB_URL` is needed; the private apps are checked through `/api/health`, which
  walks web → api → pricing.
