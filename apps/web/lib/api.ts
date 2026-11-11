// Server-side client for the shop API. The API has no public address; this app
// reaches it over the project network edge web -> api. Set API_URL on this app.
const base = () => (process.env.API_URL || "http://api:4000").replace(/\/$/, "");

export type Product = {
  sku: string; name: string; category: string; priceCents: number; stock: number; description: string;
};

export type QuoteLine = {
  sku: string; name: string; qty: number; unitCents: number; netCents: number;
  discountCents: number; vatRatePct: number; taxCents: number;
};

export type Quote = {
  country: string; lines: QuoteLine[]; subtotalCents: number; discountCents: number;
  taxCents: number; shippingCents: number; totalCents: number; notes?: string[];
};

export async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(base() + path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({ error: `api answered ${res.status}` }))) as T;
  return { status: res.status, body };
}

export function euro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}
