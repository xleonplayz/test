# The Columbus Magazine

A complete, self-contained **News Magazine** built as a standalone Next.js 14
frontend. It is deliberately feature-dense to exercise a Next.js compiler across
the App Router, React Server Components, ISR, route handlers, metadata APIs and
Markdown rendering.

- **Next.js** 14.2.5 (App Router)
- **React** 18.3.1 / **React DOM** 18.3.1
- **TypeScript** 5.5.3 (strict)
- Hand-written CSS with CSS variables and `prefers-color-scheme` dark/light — no
  Tailwind, no UI framework.

## The app

An online magazine with six sections (World, Technology, Business, Culture,
Science, Opinion), eight Markdown-authored articles, a six-person newsroom,
full-text search, related-posts ranking, an RSS feed, a sitemap and a robots
policy.

## Routes

| Route                  | Type                | Notes                                          |
| ---------------------- | ------------------- | ---------------------------------------------- |
| `/`                    | Page (ISR 300s)     | Front page: lead, latest, per-section blocks   |
| `/section/[name]`      | Page (ISR 600s)     | One static page per section, `dynamicParams=false` |
| `/article/[slug]`      | Page (ISR 3600s)    | Full article, JSON-LD, related posts via Suspense |
| `/author/[id]`         | Page (ISR 1800s)    | Author profile + their stories                 |
| `/search`              | Page (force-dynamic)| Full-text search over title/dek/body/tags      |
| `/about`               | Page (ISR 86400s)   | About + masthead                               |
| `/feed.xml`            | Route handler (ISR) | RSS 2.0 feed with Dublin Core creator tags     |
| `/sitemap.xml`         | `sitemap.ts`        | All static, section, author and article URLs   |
| `/robots.txt`          | `robots.ts`         | Allows all, disallows `/search`                |

## Next.js features used (intentionally)

- **App Router** with nested layouts, route groups and dynamic segments.
- **React Server Components** as the default; `"use client"` only where needed
  (`SearchBox`, `ThemeToggleHint`, error boundaries).
- **ISR** — per-route `export const revalidate` at varied intervals.
- **`generateStaticParams`** for sections, articles and authors.
- **`generateMetadata`** (async) — per-article OpenGraph, Twitter cards,
  canonical URLs and keywords; plus a root `metadata` with a `title.template`.
- **`viewport`** export with per-scheme theme colors.
- **Route handler** `GET` for the RSS feed (`/feed.xml`).
- **`sitemap.ts`** and **`robots.ts`** metadata files.
- **`loading.tsx`** at root, section, article and search levels (skeletons +
  spinners).
- **`not-found.tsx`** at root, section and article levels + `notFound()` calls.
- **`error.tsx`** (segment) and **`global-error.tsx`** (root) client boundaries.
- **`<Suspense>`** streaming for the related-posts block.
- **Markdown** rendering via the `unified` / `remark` / `rehype` pipeline,
  front-matter via `gray-matter`, reading time via `reading-time`.
- **JSON-LD** structured data injected per article.

## TypeScript stressors

- Discriminated unions (`ArticleBlock`), generic helpers (`Result<T, E>`,
  `Page<T>`, `paginate`), `ReadonlyMap`, type guards (`isSectionSlug`), `as const`
  literal section/author tables and exhaustive `Intl` formatters.

## Data

All content is in-memory / filesystem only — Markdown files live in `content/`,
authors and sections are static tables in `lib/`. There is no database.

## Scripts

```bash
npm run dev     # start the dev server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # next lint
```
