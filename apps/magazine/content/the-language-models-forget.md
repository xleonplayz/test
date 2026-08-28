---
title: "The Languages the Models Forget"
dek: "As AI systems standardize on a handful of tongues, thousands of others are being quietly left out of the digital future."
section: "technology"
authorId: "j-reyes"
publishedAt: "2026-06-03T10:00:00.000Z"
tags: ["ai", "language", "equity"]
status: "published"
heroEmoji: "🗣️"
---

There are roughly seven thousand living languages. The systems increasingly
mediating our access to information speak, fluently, perhaps a few dozen.

## The data gap

A model is a mirror of its training data, and the internet's text is wildly
lopsided. A handful of languages dominate; most have a vanishing footprint. The
result is predictable and unjust: tools that work beautifully in English degrade,
sometimes catastrophically, in everything else.

> "The model isn't biased on purpose," a researcher told me. "It's biased because
> the world wrote down more words in some languages than others. The machine just
> inherited the imbalance."

### What gets lost

- **Nuance.** Idiom and register flatten into something serviceable but soulless.
- **Access.** Speakers of low-resource languages get worse translation, worse
  search, worse everything.
- **Time.** Each year the gap compounds, because new tools are built on the same
  skewed foundation.

## The people fixing it

The most interesting work is not happening at the big labs. It is happening in
community projects — linguists, volunteers and native speakers painstakingly
building datasets for languages the market has ignored.

```py
# A typical community pipeline: tiny, hand-curated, fiercely local
corpus = load_recordings("village-archive/")
aligned = align(corpus, transcripts)
export(aligned, "lowresource-v1")
```

It is slow, unglamorous work. It is also, quite possibly, the only thing standing
between thousands of languages and digital erasure.
