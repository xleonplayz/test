import { Hono } from "hono";
import { products, findProduct } from "./catalog.js";
import { pricing } from "./pricing.js";

// Carts and orders live in memory; a restart empties them. The catalog is static.
const carts = new Map();
const orders = [];
let nextCart = 1;
const startedAt = Date.now();

function cartLines(cart) {
  return [...cart.items.entries()].map(([sku, qty]) => {
    const p = findProduct(sku);
    return { sku, name: p.name, category: p.category, unitCents: p.priceCents, qty };
  });
}

async function quote(cart, country = "DE", promo = "") {
  const lines = cartLines(cart);
  if (lines.length === 0) {
    return { lines: [], subtotalCents: 0, discountCents: 0, taxCents: 0, shippingCents: 0, totalCents: 0, country };
  }
  return pricing("/quote", { country, promo, items: lines });
}

export function createApp() {
  const app = new Hono();

  app.onError((err, c) => c.json({ error: err.message }, err.status || 500));

  app.get("/health", (c) => c.json({ ok: true, service: "api", uptimeS: Math.round((Date.now() - startedAt) / 1000) }));

  // Checks the edge api -> pricing as well.
  app.get("/health/deep", async (c) => {
    const p = await pricing("/health");
    return c.json({ ok: true, service: "api", pricing: p });
  });

  app.get("/products", (c) => c.json({ items: products }));
  app.get("/products/:sku", (c) => {
    const p = findProduct(c.req.param("sku"));
    return p ? c.json(p) : c.json({ error: "unknown product" }, 404);
  });

  app.post("/carts", (c) => {
    const id = `cart-${Date.now().toString(36)}-${nextCart++}`;
    carts.set(id, { id, items: new Map(), createdAt: new Date().toISOString() });
    return c.json({ id }, 201);
  });

  app.get("/carts/:id", async (c) => {
    const cart = carts.get(c.req.param("id"));
    if (!cart) return c.json({ error: "unknown cart" }, 404);
    const q = await quote(cart, c.req.query("country") || "DE", c.req.query("promo") || "");
    return c.json({ id: cart.id, quote: q });
  });

  app.post("/carts/:id/items", async (c) => {
    const cart = carts.get(c.req.param("id"));
    if (!cart) return c.json({ error: "unknown cart" }, 404);
    const { sku, qty } = await c.req.json();
    const p = findProduct(sku);
    if (!p) return c.json({ error: "unknown product" }, 400);
    const n = Number.isInteger(qty) ? qty : 1;
    const next = (cart.items.get(sku) || 0) + n;
    if (next <= 0) cart.items.delete(sku);
    else if (next > p.stock) return c.json({ error: `only ${p.stock} in stock` }, 409);
    else cart.items.set(sku, next);
    return c.json({ id: cart.id, quote: await quote(cart) });
  });

  app.delete("/carts/:id/items/:sku", async (c) => {
    const cart = carts.get(c.req.param("id"));
    if (!cart) return c.json({ error: "unknown cart" }, 404);
    cart.items.delete(c.req.param("sku"));
    return c.json({ id: cart.id, quote: await quote(cart) });
  });

  app.post("/carts/:id/checkout", async (c) => {
    const cart = carts.get(c.req.param("id"));
    if (!cart) return c.json({ error: "unknown cart" }, 404);
    const { country = "DE", promo = "" } = await c.req.json().catch(() => ({}));
    if (cart.items.size === 0) return c.json({ error: "cart is empty" }, 400);
    const q = await quote(cart, country, promo);
    for (const l of q.lines) findProduct(l.sku).stock -= l.qty;
    const order = { id: `order-${orders.length + 1}`, cart: cart.id, quote: q, placedAt: new Date().toISOString() };
    orders.push(order);
    carts.delete(cart.id);
    return c.json(order, 201);
  });

  app.get("/orders", (c) => c.json({ items: orders.slice(-20).reverse() }));

  app.notFound((c) => c.json({ error: "not found" }, 404));
  return app;
}
