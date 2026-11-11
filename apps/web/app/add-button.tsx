"use client";
import { useState } from "react";

export default function AddButton({ sku }: { sku: string }) {
  const [state, setState] = useState("");
  async function add() {
    setState("adding…");
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku, qty: 1 }),
    });
    const body = await res.json();
    setState(res.ok ? "added" : body.error || "failed");
  }
  return (
    <p>
      <button onClick={add}>Add to cart</button> <span className="muted">{state}</span>
    </p>
  );
}
