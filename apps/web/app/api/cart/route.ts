import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { cartId } from "@/lib/cart";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = await cartId(true);
  const q = new URLSearchParams({ country: url.searchParams.get("country") || "DE", promo: url.searchParams.get("promo") || "" });
  const r = await api(`/carts/${id}?${q}`);
  return NextResponse.json(r.body, { status: r.status });
}
