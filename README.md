# Teahouse Chat: real-time chat with a moderation service

A chat in three apps: a static React frontend, a Socket.IO server on Node, and
a moderation service in C++ that every message passes before it is broadcast.

```
browser ──► web (static, Vite + React)
browser ══► chat (Socket.IO, :4000) ──► moderation (C++/cpp-httplib, :6000)
```

| App | Path | What it does | Reachable |
|---|---|---|---|
| `web` | `apps/web/` | Static React app (Vite): rooms, presence, typing indicator | public |
| `chat` | `services/chat/` | Socket.IO server plus a small HTTP API, history of 100 messages per room in memory | public |
| `moderation` | `services/moderation/` | C++17 with cpp-httplib: masks blocked words (also `sc4m`-style spellings), refuses link spam, too-long messages and floods, flags shouting | private, port 6000 |

## Configuration

| App | Variable | Default | Meaning |
|---|---|---|---|
| `chat` | `MODERATION_URL` | `http://moderation:6000` | where the moderation service answers |
| `web` | `VITE_CHAT_URL` (build time) | the page's own origin | public address of the chat server |

Edge: `chat → moderation:6000`. `web` and `chat` are exposed.

The frontend is static, so it finds the chat server in this order: `?server=<url>`
in the page address (remembered in the browser), `VITE_CHAT_URL` at build time,
then the page's own origin. Open it as
`https://<web>/?server=https://<chat>` after deploying. The chat server allows
cross-origin requests.

If the moderation service cannot be reached, messages pass unchanged and carry
the flag `unmoderated`; `/health/deep` on the chat server shows the edge state.

## HTTP API of the chat server

- `GET /health`, `GET /health/deep` (includes the moderation service)
- `GET /api/rooms`
- `GET /api/rooms/{room}/messages`, `POST /api/rooms/{room}/messages {"user","text"}`

## Run locally

```
(cd services/moderation && cmake -S . -B build && cmake --build build && ./build/moderation)   # :6000
(cd services/chat && npm ci && MODERATION_URL=http://localhost:6000 npm start)                 # :4000
(cd apps/web && npm ci && VITE_CHAT_URL=http://localhost:4000 npm run build && npx vite preview)
WEB_URL=http://localhost:4173 CHAT_URL=http://localhost:4000 MODERATION_URL=http://localhost:6000 ./smoke.sh
```

## Tests

- `cd services/moderation && ctest --test-dir build` — moderation rules and the JSON reader
- `cd services/chat && npm test` — two Socket.IO clients exchange a message
- `./smoke.sh` — every app and the edge, including a WebSocket and a polling round trip

`third_party/httplib.h` is cpp-httplib 0.20.1 (MIT, see `LICENSE-httplib`).
