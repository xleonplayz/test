#!/usr/bin/env bash
# End-to-end check of the chat. Checks every app and every edge.
#   WEB_URL         the static frontend (required)
#   CHAT_URL        the Socket.IO server (required, public)
#   MODERATION_URL  the moderation service, only when reachable from here (local runs)
# On Lily the moderation service is private; the edge chat -> moderation is
# checked through the chat server (/health/deep and a moderated message).
set -u
WEB_URL=${WEB_URL:?set WEB_URL}; CHAT_URL=${CHAT_URL:?set CHAT_URL}
HERE=$(cd "$(dirname "$0")" && pwd)
fail=0
check() { # name url expected-substring [curl args...]
  local name=$1 url=$2 want=$3; shift 3
  local body code
  body=$(curl -sS -m 30 -w '\n%{http_code}' "$@" "$url" 2>&1)
  code=${body##*$'\n'}; body=${body%$'\n'*}
  if [[ $code =~ ^2 ]] && grep -qiF -- "$want" <<<"$body"; then echo "PASS $name ($code)"
  else echo "FAIL $name ($code): $(head -c 300 <<<"$body")"; fail=1; fi
}
if [[ -n ${MODERATION_URL:-} ]]; then
  check "moderation /health" "$MODERATION_URL/health" '"service":"moderation"'
  check "moderation /moderate" "$MODERATION_URL/moderate" '"text":"you l****"' -H 'content-type: application/json' -d '{"user":"smoke","text":"you l0ser"}'
fi
check "web /" "$WEB_URL/" 'Teahouse Chat'
js=$(curl -sS -m 30 "$WEB_URL/" | grep -o '/assets/index-[^"]*\.js' | head -1)
if [[ -n $js ]]; then check "web bundle $js" "$WEB_URL$js" 'socket.io'; else echo "FAIL web bundle: no script tag"; fail=1; fi
check "chat /health" "$CHAT_URL/health" '"service":"chat"'
check "edge chat->moderation (/health/deep)" "$CHAT_URL/health/deep" '"service":"moderation"'
check "socket.io polling handshake" "$CHAT_URL/socket.io/?EIO=4&transport=polling" '"sid"'
check "CORS for the frontend" "$CHAT_URL/socket.io/?EIO=4&transport=polling" 'access-control-allow-origin' -H "Origin: $WEB_URL" -D /dev/stdout
check "message masked by moderation" "$CHAT_URL/api/rooms/general/messages" '"text":"what a s***"' \
  -H 'content-type: application/json' -d '{"user":"smoke","text":"what a sc4m"}'
body=$(curl -sS -m 30 -w '\n%{http_code}' -H 'content-type: application/json' \
  -d '{"user":"smoke2","text":"buy http://a.example http://b.example www.c.example"}' "$CHAT_URL/api/rooms/general/messages")
if [[ ${body##*$'\n'} == 422 ]] && grep -q 'spam' <<<"$body"; then echo "PASS link spam refused (422)"; else echo "FAIL link spam: $body"; fail=1; fi
check "history" "$CHAT_URL/api/rooms/general/messages" '"user":"smoke"'
if command -v node >/dev/null && [[ -d $HERE/services/chat/node_modules/socket.io-client ]]; then
  for t in websocket polling; do
    out=$(cd "$HERE/services/chat" && node scripts/ws-check.mjs "$CHAT_URL" "$t" 2>&1)
    if [[ $out == OK* ]]; then echo "PASS realtime $t: $out"; else echo "FAIL realtime $t: $out"; fail=1; fi
  done
else
  echo "SKIP realtime check (run npm install in services/chat)"
fi
[[ $fail = 0 ]] && echo "smoke: all checks passed" || echo "smoke: FAILED"
exit $fail
