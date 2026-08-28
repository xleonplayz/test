---
title: "The Quiet Rewrite: How One Team Replaced Its Entire Stack"
dek: "A small platform team spent eighteen months migrating off a monolith. Almost nobody noticed — and that was the point."
section: "technology"
authorId: "j-reyes"
publishedAt: "2026-05-30T08:00:00.000Z"
updatedAt: "2026-06-02T11:30:00.000Z"
tags: ["engineering", "migration", "infrastructure"]
status: "featured"
heroEmoji: "🧩"
---

There is a particular kind of engineering victory that nobody applauds, because
nobody outside the team ever sees it. The system that was slow is now fast. The
deploys that took an hour take four minutes. And the customer, blissfully, has no
idea anything changed at all.

## The shape of the problem

The old monolith was not bad code. It was *successful* code, which is a different
and more dangerous thing. Success had glued a thousand features to a single
deployable, and every one of those features had an owner who would notice if it
broke.

> You don't get to stop the world to fix the engine. You rebuild the plane in
> flight, one rivet at a time.

The team's first decision was the most important: **no big bang**. There would be
no flag day, no weekend cutover, no all-hands rollback plan. Instead they drew a
seam down the middle of the system and started routing traffic across it.

### Routing as a refactoring tool

The trick was to treat the network boundary as a refactoring tool. A request
came in, hit a thin router, and was sent either to the old path or the new one.
At first, one route in a hundred went to the new code. Then one in ten. Then half.

```ts
function route(req: Request): "legacy" | "next" {
  const cohort = hash(req.headers.get("x-user") ?? "anon") % 100;
  return cohort < rolloutPercent ? "next" : "legacy";
}
```

Every increase in `rolloutPercent` was a tiny, reversible bet. When the new path
misbehaved, they turned the dial down. When it held, they turned it up.

## What they learned

1. **Observability is a prerequisite, not a follow-up.** You cannot dial up
   traffic you cannot see.
2. **The seam matters more than the rewrite.** A clean boundary made the work
   parallelizable across the whole team.
3. **Boring is the goal.** The best migration is the one your users describe, if
   asked, as "nothing happening."

Eighteen months later the monolith was gone. There was no launch party. Someone
deleted the last legacy service on a Tuesday afternoon, and then everyone went to
lunch.
