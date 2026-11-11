---
title: Products
section: Catalog
order: 3
---
# Products

`GET /products` returns the whole catalog; `GET /products/{sku}` returns one product or
`404` when the SKU is unknown.

## Fields

| Field | Meaning |
|---|---|
| `sku` | Stable product id, for example `POT-020` |
| `name` | Display name |
| `category` | `food`, `books` or `goods`; it decides the VAT rate |
| `priceCents` | Net price in euro cents |
| `stock` | Pieces available right now |

## Categories and tax

Tea counts as `food` and books as `books`; both take the reduced VAT rate in most
countries. Cups, pots and kits are `goods` at the standard rate. See
[Pricing and taxes](/docs/pricing-and-taxes).
