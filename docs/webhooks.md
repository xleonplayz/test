---
title: Webhooks
section: Reference
order: 9
---
# Webhooks

Register an HTTPS endpoint to hear about orders without polling. We send a `POST` with
a JSON event for `order.placed`, `order.shipped` and `order.refunded`.

## Verifying signatures

Each delivery carries a `lk-signature` header: an HMAC-SHA256 of the raw body with
your webhook secret. Compute it on your side and compare in constant time; drop the
delivery when it does not match.

## Retries

A delivery counts as received when your endpoint answers `2xx` within ten seconds.
Otherwise we retry with exponential backoff for up to three days. Make your handler
idempotent: the event `id` stays the same across retries.
