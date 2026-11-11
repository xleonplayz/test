---
title: Rate limits
section: Reference
order: 8
---
# Rate limits

Each key may send 50 requests per second with bursts up to 100. Reads of the catalog
are cached at the edge and do not count.

When you exceed the limit the API answers `429 too many requests` with a
`retry-after` header in seconds. Wait at least that long before the next call.

## Tips

- Cache the catalog for a minute instead of loading it on every page view.
- Batch cart changes on the client and send them when the shopper pauses.
- Use one cart per shopper session, not one per page.
