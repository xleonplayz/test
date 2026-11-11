---
title: Carts
section: Ordering
order: 4
---
# Carts

A cart collects products before checkout. Create one, add items, and ask for a quote
at any time.

```
POST /carts                          -> {"id": "cart-..."}
POST /carts/{id}/items  {"sku": "TEA-001", "qty": 2}
DELETE /carts/{id}/items/{sku}
GET  /carts/{id}?country=AT&promo=WELCOME10
```

Every change answers with a fresh quote, so your page can redraw totals right away.
A negative `qty` removes pieces; reaching zero drops the line.

## Stock

Adding more pieces than are in stock answers `409 conflict` with the number available.
Stock is reserved only at checkout, not while items sit in a cart.

## Lifetime

Carts live in memory for 24 hours. An unknown cart id answers `404`; create a new cart
and add the items again.
