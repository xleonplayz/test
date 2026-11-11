---
title: Pricing and taxes
section: Ordering
order: 6
---
# Pricing and taxes

The pricing service computes every total. It applies, in this order:

1. **Volume discount**: 10 % off a line from three pieces of the same product.
2. **Promo code**: `WELCOME10` takes 10 %, `TEA20` takes 20 % off what is left.
3. **VAT** per country and category.
4. **Shipping**: free from 50 EUR of discounted goods, otherwise 4.90 EUR within
   Germany and 9.90 EUR elsewhere.

## VAT rates

| Country | Standard | Reduced (food, books) |
|---|---|---|
| DE | 19 % | 7 % |
| AT | 20 % | 10 % |
| FR | 20 % | 5.5 % |
| NL | 21 % | 9 % |
| CH | 0 % | 0 % |

Amounts are rounded half up per line, in cents. Show the quote's `totalCents`
unchanged; never recompute taxes in the browser.
