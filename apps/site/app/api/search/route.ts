import { NextResponse } from "next/server";
import { searchApi } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = new URLSearchParams({ q: url.searchParams.get("q") || "", limit: url.searchParams.get("limit") || "10" });
  const r = await searchApi(`/search?${q}`);
  return NextResponse.json(r.body, { status: r.status });
}
