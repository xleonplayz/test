// Client for the pricing service. It has no public address; the API reaches it
// over the project network edge api -> pricing.
const base = () => (process.env.PRICING_URL || "http://pricing:5000").replace(/\/$/, "");

export async function pricing(path, body) {
  const res = await fetch(base() + path, body === undefined ? {} : {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 200) }; }
  if (!res.ok) {
    const err = new Error(data.error || `pricing answered ${res.status}`);
    err.status = 502;
    throw err;
  }
  return data;
}
