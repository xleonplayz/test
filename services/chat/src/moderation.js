// Client for the moderation service (C++). It has no public address; the chat
// server reaches it over the project network edge chat -> moderation.
const base = () => (process.env.MODERATION_URL || "http://moderation:6000").replace(/\/$/, "");

export async function moderationHealth() {
  const res = await fetch(base() + "/health", { signal: AbortSignal.timeout(5000) });
  return res.json();
}

// Returns {allowed, text, flags, score, reason?}. When the service cannot be
// reached the message passes unchanged and is marked "unmoderated".
export async function moderate(user, text) {
  try {
    const res = await fetch(base() + "/moderate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user, text }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`moderation answered ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("moderation unavailable:", err.message);
    return { allowed: true, text, flags: ["unmoderated"], score: 0 };
  }
}
