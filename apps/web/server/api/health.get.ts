// Walks the chain web -> api -> worker and reports each hop.
export default defineEventHandler(async (event) => {
  const t0 = Date.now();
  try {
    const chain = await api("/health/deep");
    return { ok: true, web: { ok: true, service: "web" }, chain, ms: Date.now() - t0 };
  } catch (e: any) {
    setResponseStatus(event, 502);
    return { ok: false, web: { ok: true }, error: String(e?.message || e), ms: Date.now() - t0 };
  }
});
