---
title: Authentication
section: Basics
order: 2
---
# Authentication

Reading the catalog needs no key. Creating carts, placing orders and reading orders
need an API key sent as a bearer token:

```
Authorization: Bearer lk_live_...
```

## Keys

Keys start with `lk_test_` in the sandbox and `lk_live_` in production. A test key never
touches real stock or payments. Rotate a key from the console; the old key keeps working
for 24 hours so you can roll out the new one without downtime.

## Scopes

A key carries scopes: `catalog:read`, `cart:write`, `orders:read` and `orders:write`.
A call outside the key's scopes answers `403 forbidden` with the missing scope in the
`error` field. Give storefront servers `cart:write` only; keep `orders:read` for your
back office.
