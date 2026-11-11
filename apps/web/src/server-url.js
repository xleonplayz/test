// Where the chat server lives. This app is static, so the address comes from
// (in order): ?server=<url> in the page address, the value saved in this
// browser, VITE_CHAT_URL at build time, or this page's own origin.
const KEY = "chat.server";

export function serverUrl() {
  const fromQuery = new URLSearchParams(location.search).get("server");
  if (fromQuery) {
    try { localStorage.setItem(KEY, fromQuery); } catch { /* private mode */ }
    return fromQuery;
  }
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
  } catch { /* private mode */ }
  return import.meta.env.VITE_CHAT_URL || location.origin;
}

export function saveServerUrl(url) {
  try { localStorage.setItem(KEY, url); } catch { /* private mode */ }
}
