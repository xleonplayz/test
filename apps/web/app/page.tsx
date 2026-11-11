import { api, euro, type Product } from "@/lib/api";
import AddButton from "./add-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const r = await api<{ items: Product[] }>("/products");
  return (
    <>
      <h1>Tea, cups and pots</h1>
      <p className="muted">Prices without VAT; the pricing service adds tax for your country at checkout.</p>
      <div className="grid">
        {r.body.items.map((p) => (
          <div className="card" key={p.sku}>
            <h3><a href={`/products/${p.sku}`}>{p.name}</a></h3>
            <div className="muted">{p.description}</div>
            <div className="price">{euro(p.priceCents)}</div>
            <AddButton sku={p.sku} />
          </div>
        ))}
      </div>
    </>
  );
}
