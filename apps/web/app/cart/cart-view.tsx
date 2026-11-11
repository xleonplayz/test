"use client";
import { useEffect, useState } from "react";

type Line = { sku: string; name: string; qty: number; netCents: number; discountCents: number; vatRatePct: number; taxCents: number };
type Quote = { lines: Line[]; subtotalCents: number; discountCents: number; taxCents: number; shippingCents: number; totalCents: number; notes?: string[] };

const euro = (c: number) => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export default function CartView() {
  const [country, setCountry] = useState("DE");
  const [promo, setPromo] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch(`/api/cart?country=${country}&promo=${encodeURIComponent(promo)}`);
    const body = await res.json();
    if (res.ok) setQuote(body.quote); else setMessage(body.error || "could not load the cart");
  }
  useEffect(() => { load(); }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  async function change(sku: string, qty: number) {
    await fetch("/api/cart/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sku, qty }) });
    load();
  }
  async function checkout() {
    const res = await fetch("/api/cart/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ country, promo }) });
    const body = await res.json();
    if (res.ok) { setMessage(`Order ${body.id} placed, total ${euro(body.quote.totalCents)}.`); setQuote(null); }
    else setMessage(body.error || "checkout failed");
  }

  if (!quote) return <p className="muted">{message || "Loading…"}</p>;
  if (quote.lines.length === 0) return <p className="muted">{message || "The cart is empty."} <a href="/">Go shopping</a></p>;
  return (
    <div className="card">
      <table>
        <thead><tr><th>Product</th><th className="num">Qty</th><th className="num">Net</th><th className="num">Discount</th><th className="num">VAT</th><th /></tr></thead>
        <tbody>
          {quote.lines.map((l) => (
            <tr key={l.sku}>
              <td>{l.name}</td>
              <td className="num">{l.qty}</td>
              <td className="num">{euro(l.netCents)}</td>
              <td className="num">{l.discountCents ? `−${euro(l.discountCents)}` : ""}</td>
              <td className="num">{l.vatRatePct} %</td>
              <td className="num"><button className="ghost" onClick={() => change(l.sku, -1)}>−</button> <button className="ghost" onClick={() => change(l.sku, 1)}>+</button></td>
            </tr>
          ))}
          <tr><td colSpan={2}>Subtotal</td><td className="num">{euro(quote.subtotalCents)}</td><td className="num">−{euro(quote.discountCents)}</td><td className="num">{euro(quote.taxCents)}</td><td /></tr>
          <tr><td colSpan={4}>Shipping</td><td className="num">{euro(quote.shippingCents)}</td><td /></tr>
          <tr className="total"><td colSpan={4}>Total</td><td className="num">{euro(quote.totalCents)}</td><td /></tr>
        </tbody>
      </table>
      {quote.notes?.length ? <p className="muted">{quote.notes.join(" · ")}</p> : null}
      <p>
        Ship to{" "}
        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          {["DE", "AT", "FR", "NL", "CH"].map((c) => <option key={c}>{c}</option>)}
        </select>{" "}
        Promo code <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="WELCOME10" />{" "}
        <button className="ghost" onClick={load}>Apply</button>
      </p>
      <p><button onClick={checkout}>Place order</button> <span className="muted">{message}</span></p>
    </div>
  );
}
