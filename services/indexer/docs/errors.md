---
title: Errors
section: Reference
order: 7
---
# Errors

Errors answer with a status code and a JSON body `{"error": "..."}` that explains the
problem in one sentence.

| Status | When |
|---|---|
| `400` | The request body is malformed or the cart is empty |
| `403` | The key lacks a scope |
| `404` | Unknown product, cart or route |
| `409` | Not enough stock |
| `422` | The pricing service refused the quote, for example an unknown country |
| `429` | Too many requests; see [Rate limits](/docs/rate-limits) |
| `502` | A service behind the API did not answer; retry later |

Retry only `429` and `502`, and only with backoff. Every other error needs a changed
request.
