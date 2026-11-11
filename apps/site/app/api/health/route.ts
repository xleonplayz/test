import { NextResponse } from "next/server";
import { searchApi } from "@/lib/search";

export const dynamic = "force-dynamic";

// Walks the chain site -> search -> indexer and reports each hop.
export async function GET() {
  const t0 = Date.now();
  try {
    const r = await searchApi<Record<string, unknown>>("/health/deep");
    return NextResponse.json({ ok: r.status === 200, site: { ok: true }, chain: r.body, ms: Date.now() - t0 }, { status: r.status === 200 ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, site: { ok: true }, error: String(e), ms: Date.now() - t0 }, { status: 502 });
  }
}
