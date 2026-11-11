import { cookies } from "next/headers";
import { api } from "./api";

const COOKIE = "shop_cart";

// Returns the cart id from the cookie, creating a cart at the API when none exists
// or the API forgot it (the API keeps carts in memory).
export async function cartId(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) {
    const r = await api(`/carts/${existing}`);
    if (r.status === 200) return existing;
  }
  if (!create) return null;
  const r = await api<{ id: string }>("/carts", { method: "POST" });
  jar.set(COOKIE, r.body.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  return r.body.id;
}
