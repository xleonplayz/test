#!/usr/bin/env bash
# Faehrt die drei Dienste lokal an und stellt api die Fragen, die web stellt.
#
# Baut inventory (cargo) und pricing (gcc) nativ, startet sie mit --serve,
# startet api mit --serve gegen die beiden, und prueft:
#   - jeder Dienst antwortet auf /health
#   - /overview ist vollstaendig (missing == [])
#   - der Ausfall von pricing ist eine ANTWORT (missing == ["pricing"]),
#     kein Fehler
set -euo pipefail
cd "$(dirname "$0")/.."

PI=18082; PP=18083; PA=18081
cleanup() { kill "${PIDS[@]}" 2>/dev/null || true; }
PIDS=()
trap cleanup EXIT

( cd services/inventory && cargo build --release -q )
gcc -O2 -o /tmp/pricing-smoke services/pricing/src/main.c

PORT=$PI services/inventory/target/release/inventory --serve & PIDS+=($!)
PORT=$PP /tmp/pricing-smoke --serve & PIDS+=($!)
# npm-Workspaces heben tsx an die Wurzel; ohne Workspace liegt es bei api.
[ -x node_modules/.bin/tsx ] || npm install --silent
TSX=node_modules/.bin/tsx; [ -x "$TSX" ] || TSX=services/api/node_modules/.bin/tsx
PORT=$PA INVENTORY_URL=http://127.0.0.1:$PI PRICING_URL=http://127.0.0.1:$PP \
  "$TSX" services/api/src/server.ts --serve & PIDS+=($!)
sleep 1.5

pruefe() { # name, url, jq-Ausdruck, erwartet
  local got; got=$(curl -sf "$2" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);console.log(JSON.stringify(eval(process.argv[1])))})' "$3")
  if [ "$got" = "$4" ]; then echo "  ok   $1: $got"; else echo "  ROT  $1: $got, erwartet $4"; exit 1; fi
}
echo "Dienste einzeln:"
pruefe inventory "http://127.0.0.1:$PI/health" 'o.app' '"inventory"'
pruefe pricing   "http://127.0.0.1:$PP/price/cable-04?qty=60" 'o.total_cents' '45390'
pruefe api       "http://127.0.0.1:$PA/health" 'o.upstreams' '{"inventory":"up","pricing":"up"}'
echo "Zusammengelegt:"
pruefe overview  "http://127.0.0.1:$PA/overview" 'o.missing' '[]'
pruefe order     "http://127.0.0.1:$PA/orders/o-1002" 'o.lines.map(l=>l.in_stock)' '[true,false]'
echo "Teilausfall (pricing weg):"
kill "${PIDS[1]}"; sleep 0.3
pruefe overview  "http://127.0.0.1:$PA/overview" 'o.missing' '["pricing"]'
pruefe order     "http://127.0.0.1:$PA/orders/o-1001" 'o.total_cents' 'null'
echo "Cap-Modus (stdin -> stdout):"
printf 'GET /items/lamp-01 HTTP/1.1\r\nHost: x\r\n\r\n' | services/inventory/target/release/inventory | grep -q '"stock":12' && echo "  ok   inventory einmal"
printf 'GET /price/desk-02?qty=3 HTTP/1.1\r\n\r\n' | /tmp/pricing-smoke | grep -q '"discount_percent":5' && echo "  ok   pricing einmal"
printf 'GET /health HTTP/1.1\r\n\r\n' | INVENTORY_URL=http://127.0.0.1:$PI PRICING_URL=http://127.0.0.1:1 "$TSX" services/api/src/server.ts | grep -q '"inventory":"up"' && echo "  ok   api einmal (pricing als Ausfall gemeldet)"
echo "alles gruen"
