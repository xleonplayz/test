#!/usr/bin/env bash
# End-to-end check of the dashboard. Checks every app and every edge.
#   WEB_URL     the Nuxt dashboard (required)
#   API_URL     the Express API, only when reachable from here (local runs)
#   WORKER_URL  the Rust worker, only when reachable from here (local runs)
# On Lily the API and worker are private; the edges are checked through the
# dashboard (/api/health walks web -> api -> worker, events go the same way).
set -u
WEB_URL=${WEB_URL:?set WEB_URL}
fail=0
tag="smoke.check_$$"
check() { # name url expected-substring [curl args...]
  local name=$1 url=$2 want=$3; shift 3
  local body code
  body=$(curl -sS -m 30 -w '\n%{http_code}' "$@" "$url" 2>&1)
  code=${body##*$'\n'}; body=${body%$'\n'*}
  if [[ $code =~ ^2 ]] && grep -qF -- "$want" <<<"$body"; then echo "PASS $name ($code)"
  else echo "FAIL $name ($code): $(head -c 300 <<<"$body")"; fail=1; fi
}
json=(-H 'content-type: application/json')
if [[ -n ${WORKER_URL:-} ]]; then
  check "worker /health" "$WORKER_URL/health" '"service":"worker"'
  check "worker /ingest" "$WORKER_URL/ingest" '"accepted":2' "${json[@]}" -d '{"events":[{"metric":"w.direct","value":3},{"metric":"w.direct","value":5}]}'
  check "worker job run" "$WORKER_URL/jobs/run" '"events"' -X POST
  check "worker /series" "$WORKER_URL/series?metric=w.direct&minutes=5" '"avg":4.0'
fi
if [[ -n ${API_URL:-} ]]; then
  check "api /health" "$API_URL/health" '"service":"api"'
  check "edge api->worker (/health/deep)" "$API_URL/health/deep" '"service":"worker"'
  check "api POST /api/events" "$API_URL/api/events" '"stored":1' "${json[@]}" -d "{\"metric\":\"$tag.api\",\"value\":7}"
fi
check "web /" "$WEB_URL/" 'Pulse'
check "edge web->api->worker (/api/health)" "$WEB_URL/api/health" '"service":"worker"'
check "event through web->api->worker" "$WEB_URL/api/events" '"stored":3' "${json[@]}" \
  -d "[{\"metric\":\"$tag\",\"value\":10},{\"metric\":\"$tag\",\"value\":20},{\"metric\":\"$tag\",\"value\":30}]"
# The worker folds events in its background job (every 2 s by default).
ok=0
for _ in $(seq 1 15); do
  sleep 2
  if curl -sS -m 20 "$WEB_URL/api/series/$tag?minutes=5" | grep -q '"count":3'; then ok=1; break; fi
done
if [[ $ok = 1 ]]; then echo "PASS background aggregation (series of $tag has count 3)"; else echo "FAIL background aggregation of $tag"; fail=1; fi
check "overview lists the metric" "$WEB_URL/api/overview" "\"metric\":\"$tag\""
check "demo traffic aggregated" "$WEB_URL/api/overview" '"metric":"http.latency_ms"'
[[ $fail = 0 ]] && echo "smoke: all checks passed" || echo "smoke: FAILED"
exit $fail
