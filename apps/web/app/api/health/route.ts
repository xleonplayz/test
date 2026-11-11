import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

// Walks the whole chain web -> api -> pricing and reports each hop.
export async function GET() {
  const t0 = Date.now();
  try {
    const r = await api<Record<string, unknown>>("/health/deep");
    return NextResponse.json({ ok: r.status === 200, web: { ok: true }, chain: r.body, ms: Date.now() - t0 }, { status: r.status === 200 ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, web: { ok: true }, error: String(e), ms: Date.now() - t0 }, { status: 502 });
  }
}
