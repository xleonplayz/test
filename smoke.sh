#!/usr/bin/env bash
# End-to-end check of the docs portal. Checks every app and every edge.
#   SITE_URL     the documentation site (required)
#   SEARCH_URL   the search API, only when reachable from here (local runs)
#   INDEXER_URL  the indexer, only when reachable from here (local runs)
# On Lily search and indexer are private; the edges are checked through the
# site (/api/health walks site -> search -> indexer, /search ranks through both).
set -u
SITE_URL=${SITE_URL:?set SITE_URL}
fail=0
check() { # name url expected-substring [curl args...]
  local name=$1 url=$2 want=$3; shift 3
  local body code
  body=$(curl -sS -m 30 -w '\n%{http_code}' "$@" "$url" 2>&1)
  code=${body##*$'\n'}; body=${body%$'\n'*}
  if [[ $code =~ ^2 ]] && grep -qF -- "$want" <<<"$body"; then echo "PASS $name ($code)"
  else echo "FAIL $name ($code): $(head -c 300 <<<"$body")"; fail=1; fi
}
if [[ -n ${INDEXER_URL:-} ]]; then
  check "indexer /health" "$INDEXER_URL/health" '"docs":9'
  check "indexer /index" "$INDEXER_URL/index" '"avgLength"'
fi
if [[ -n ${SEARCH_URL:-} ]]; then
  check "search /health" "$SEARCH_URL/health" '"service":"search"'
  check "edge search->indexer (/health/deep)" "$SEARCH_URL/health/deep" '"service":"indexer"'
  check "search ranks 'vat rate'" "$SEARCH_URL/search?q=vat+rate" '"id":"pricing-and-taxes"'
  check "suggest 'web'" "$SEARCH_URL/suggest?prefix=web" '"webhook"'
fi
check "site /" "$SITE_URL/" 'Leaf &amp; Kettle API documentation'
check "site /docs/checkout (static)" "$SITE_URL/docs/checkout" 'turns a cart into an order'
check "site /docs/pricing-and-taxes table" "$SITE_URL/docs/pricing-and-taxes" '<td>5.5 %</td>'
check "edge site->search->indexer (/api/health)" "$SITE_URL/api/health" '"service":"indexer"'
check "search page ranks through both" "$SITE_URL/search?q=signature" 'Webhooks'
check "instant search API" "$SITE_URL/api/search?q=backoff&limit=3" '"results"'
[[ $fail = 0 ]] && echo "smoke: all checks passed" || echo "smoke: FAILED"
exit $fail
