# Columbus — SaaS Marketing Landing

A standalone, fully-internationalized **SaaS marketing site** built with
Next.js 14.2.5 (App Router), React 18.3.1 and TypeScript (strict). It markets a
fictional warehouse-native product-analytics product called *Columbus*.

The app is intentionally feature-dense to stress-test a Next.js compiler:
locale routing, server actions, dynamic OG images, metadata generation,
discriminated-union data models, generics, Suspense and handwritten CSS with
animations.

## Stack & conventions

- Next.js **14.2.5**, App Router, React **18.3.1**, TypeScript **strict**.
- `tsconfig` path alias `@/*`, `moduleResolution: "bundler"`, `jsx: "preserve"`.
- **No Tailwind, no UI framework.** All styling lives in `app/globals.css`
  using CSS variables, `prefers-color-scheme` dark/light and keyframe animations.
- Server Components by default; `"use client"` only where interactivity needs it.

## Internationalization

- Locales: `en`, `de`, `fr` (see `lib/i18n.ts`).
- Every page lives under the `[lang]` dynamic segment.
- `generateStaticParams` pre-renders all locales (and all blog posts × locales).
- `middleware.ts` negotiates the locale from `Accept-Language` and **redirects**
  any non-localized path to `/<locale>/...`.

## Routes

| Route | Description |
|---|---|
| `/[lang]` | Home: hero, stats, features, testimonials, FAQ, CTA |
| `/[lang]/features` | Features grouped by category (ingest/model/explore/govern) |
| `/[lang]/pricing` | Interactive pricing table with monthly/yearly toggle + FAQ |
| `/[lang]/about` | Company story, values and team |
| `/[lang]/blog` | Blog index (localized posts, sorted by date) |
| `/[lang]/blog/[slug]` | Individual post (statically generated per locale) |
| `/[lang]/changelog` | Versioned release timeline |
| `/[lang]/contact` | Contact form backed by a Server Action with validation |
| `/og` | Dynamic Open Graph image (`?title=&subtitle=`), edge runtime |
| `/sitemap.xml` | Generated sitemap across all locales + posts |
| `/robots.txt` | Generated robots policy |

Implicit routes: global `not-found.tsx`, per-segment `loading.tsx` and
`error.tsx`.

## Next.js / React / TS features exercised

- **i18n via `[lang]` segment + `generateStaticParams`** (layout, post route).
- **Server Action** (`app/actions/contact.ts`, `"use server"`) with typed
  discriminated-union result and per-field validation.
- **`useFormState` / `useFormStatus`** client form (`ContactForm.tsx`).
- **Dynamic OG image** via `ImageResponse` from `next/og` (edge runtime).
- **Metadata API**: `title.template`, `generateMetadata`, OpenGraph, alternates,
  `viewport` / `themeColor`.
- **`sitemap.ts` / `robots.ts`** file conventions.
- **`loading.tsx`, `error.tsx`, `not-found.tsx`** boundaries.
- **`Suspense`** around the contact form.
- **`usePathname`** for active-nav + locale-preserving language switch.
- **CSS animations** (`fadeUp`, `pulse`, `drift`, `shake`) with
  `prefers-reduced-motion` opt-out and dark/light theming.
- **TypeScript depth**: generics (`FeatureGrid` filtering), discriminated unions
  (`ContactState`, `Cadence`), mapped/record types (`LocalizedText`,
  `Record<Locale, …>`), `Intl.NumberFormat` / `Intl.DateTimeFormat`.

## Data

All content is in-memory under `lib/` (no database):

- `lib/i18n.ts` — locales, dictionaries, typed translator.
- `lib/types.ts` — shared domain types & unions.
- `lib/plans.ts` — pricing plans + price formatting.
- `lib/content.ts` — features, testimonials, FAQ, blog posts, changelog.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000 → redirects to /en
npm run build
npm start
```
