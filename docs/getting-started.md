---
title: Getting started
section: Basics
order: 1
---
# Getting started

The Leaf & Kettle API lets you list teas, fill carts and place orders from your own
storefront. Every endpoint speaks JSON over HTTPS and answers within a few milliseconds.

## Your first request

List the catalog with a plain `GET`:

```
curl https://api.leafandkettle.example/products
```

The answer holds an `items` array. Each product has a `sku`, a `name`, a `category`
and a net `priceCents`. Prices never include VAT; the pricing service adds tax for the
destination country when you ask for a quote.

## Next steps

- Read [Authentication](/docs/authentication) to get a key for write calls.
- Walk through [Carts](/docs/carts) to build a checkout.
- Check [Pricing and taxes](/docs/pricing-and-taxes) before you show totals to shoppers.
