---
title: Checkout
section: Ordering
order: 5
---
# Checkout

`POST /carts/{id}/checkout` turns a cart into an order. Send the destination country and
an optional promo code:

```
{"country": "DE", "promo": "TEA20"}
```

The answer is the order with its final quote: lines, discount, VAT, shipping and the
total in cents. The cart is gone afterwards; checking out the same cart twice answers
`404`.

## Failures

An empty cart answers `400`. A country we do not ship to answers `422` with
`we do not ship to XX`. If the pricing service is unreachable the API answers `502`
and nothing is charged; retry with exponential backoff.
