#!/usr/bin/env bash
# End-to-end check of the shop. Checks every app and every edge.
#   WEB_URL      the storefront (required), e.g. https://slug12--dev.lilylabs.app
#   API_URL      the API, only when it is reachable from here (local runs)
#   PRICING_URL  the pricing service, only when reachable from here (local runs)
# On Lily the API and pricing are private; the edges are then checked through
# the storefront (/api/health walks web -> api -> pricing).
set -u
WEB_URL=${WEB_URL:?set WEB_URL}
fail=0
check() { # name url expected-substring [curl args...]
  local name=$1 url=$2 want=$3; shift 3
  local body code
  body=$(curl -sS -m 30 -w '\n%{http_code}' "$@" "$url" 2>&1)
  code=${body##*$'\n'}; body=${body%$'\n'*}
  if [[ $code =~ ^2 ]] && grep -qF -- "$want" <<<"$body"; then
    echo "PASS $name ($code)"
  else
    echo "FAIL $name ($code): $(head -c 300 <<<"$body")"; fail=1
  fi
}
if [[ -n ${PRICING_URL:-} ]]; then
  check "pricing /health" "$PRICING_URL/health" '"service":"pricing"'
  check "pricing /quote" "$PRICING_URL/quote" '"totalCents":3751' -H 'content-type: application/json' \
    -d '{"country":"DE","items":[{"sku":"CUP-010","category":"goods","unitCents":1850,"qty":1},{"sku":"TEA-002","category":"food","unitCents":990,"qty":1}]}'
fi
if [[ -n ${API_URL:-} ]]; then
  check "api /health" "$API_URL/health" '"service":"api"'
  check "api /products" "$API_URL/products" 'Cast Iron Teapot'
  check "edge api->pricing (api /health/deep)" "$API_URL/health/deep" '"service":"pricing"'
fi
check "web /" "$WEB_URL/" 'Sencha Green Tea'
check "web /products/POT-020" "$WEB_URL/products/POT-020" 'tetsubin'
check "edge web->api->pricing (web /api/health)" "$WEB_URL/api/health" '"service":"pricing"'
jar=$(mktemp); trap 'rm -f "$jar"' EXIT
check "cart add (web->api->pricing)" "$WEB_URL/api/cart/items" '"totalCents"' -c "$jar" -b "$jar" \
  -H 'content-type: application/json' -d '{"sku":"POT-020","qty":3}'
check "cart quote AT with promo" "$WEB_URL/api/cart?country=AT&promo=WELCOME10" '"promo":"WELCOME10"' -c "$jar" -b "$jar"
check "checkout" "$WEB_URL/api/cart/checkout" '"order-' -c "$jar" -b "$jar" \
  -H 'content-type: application/json' -d '{"country":"DE","promo":"TEA20"}'
[[ $fail = 0 ]] && echo "smoke: all checks passed" || echo "smoke: FAILED"
exit $fail
