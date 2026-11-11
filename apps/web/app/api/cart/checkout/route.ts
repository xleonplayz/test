import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { cartId } from "@/lib/cart";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = await cartId(false);
  if (!id) return NextResponse.json({ error: "cart is empty" }, { status: 400 });
  const r = await api(`/carts/${id}/checkout`, { method: "POST", body: JSON.stringify(body) });
  return NextResponse.json(r.body, { status: r.status });
}
