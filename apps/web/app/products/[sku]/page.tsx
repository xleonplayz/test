import { notFound } from "next/navigation";
import { api, euro, type Product } from "@/lib/api";
import AddButton from "../../add-button";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  const r = await api<Product>(`/products/${encodeURIComponent(sku)}`);
  if (r.status === 404) notFound();
  const p = r.body;
  return (
    <div className="card">
      <h1>{p.name}</h1>
      <p>{p.description}</p>
      <p className="muted">SKU {p.sku} · {p.category} · {p.stock} in stock</p>
      <p className="price">{euro(p.priceCents)} (net)</p>
      <AddButton sku={p.sku} />
    </div>
  );
}
