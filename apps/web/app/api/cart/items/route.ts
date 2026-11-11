import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { cartId } from "@/lib/cart";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { sku, qty } = await req.json();
  const id = await cartId(true);
  const r = await api(`/carts/${id}/items`, { method: "POST", body: JSON.stringify({ sku, qty }) });
  return NextResponse.json(r.body, { status: r.status });
}
