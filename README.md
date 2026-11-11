# Leaf & Kettle Docs: a documentation portal with full-text search

Documentation for the (fictional) Leaf & Kettle shop API, in three apps: a
Next.js site with prerendered pages, a search API that ranks with BM25, and a
Rust indexer that parses the Markdown and builds the index.

```
browser ──► site (Next.js) ──► search (Hono, :4000) ──► indexer (Rust/axum, :5000)
```

| App | Path | What it does | Reachable |
|---|---|---|---|
| `site` | `apps/site/` | Next.js 15: every doc page prerendered at build time, a search page and search-as-you-type | public |
| `search` | `services/search/` | Hono on Node: loads the index from the indexer (refresh every minute), BM25 ranking, snippets, prefix suggestions | private, port 4000 |
| `indexer` | `services/indexer/` | Rust: embeds the Markdown at compile time, tokenizes, stems, counts term and document frequencies, serves the index | private, port 5000 |

The documentation lives in `docs/`. `scripts/sync-docs.sh` copies it into the
two apps that need it (the site gets one JSON module, the indexer the files);
run it after editing `docs/` and commit the result. Neither app reads files at
run time.

## Configuration

| App | Variable | Default | Meaning |
|---|---|---|---|
| `site` | `SEARCH_URL` | `http://search:4000` | where the search API answers |
| `search` | `INDEXER_URL` | `http://indexer:5000` | where the indexer answers |

Edges: `site → search:4000`, `search → indexer:5000`. Only `site` is exposed.

## Run locally

```
(cd services/indexer && cargo run --release)                                 # :5000
(cd services/search && npm ci && INDEXER_URL=http://localhost:5000 npm start)  # :4000
(cd apps/site && npm ci && npm run build && SEARCH_URL=http://localhost:4000 npm start)
SITE_URL=http://localhost:3000 SEARCH_URL=http://localhost:4000 INDEXER_URL=http://localhost:5000 ./smoke.sh
```

## Tests

- `cd services/indexer && cargo test` — tokenizer, front matter, document frequencies
- `cd services/search && npm test` — ranking, snippets, suggestions
- `./smoke.sh` — every app and every edge
