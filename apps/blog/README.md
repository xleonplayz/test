# Columbus Blog

Ein vollständiger, eigenständiger Blog als Next.js-Frontend (App Router,
TypeScript). Teil der Columbus-Sammlung von Next.js-Testprojekten für den
Next.js-Compiler.

## Features

- **App Router** mit Server Components
- **Dynamische Routen** `/posts/[slug]` mit `generateStaticParams`
- **Tag-System** mit Übersicht (`/tags`) und Filterseiten (`/tags/[tag]`)
- **Markdown-Beiträge** mit Frontmatter (gray-matter)
- **Markdown-Rendering** über remark/rehype inkl. GFM, Slugs und
  Syntax-Highlighting (highlight.js)
- **Lesezeit-Berechnung** pro Beitrag
- **Metadaten-API** (`generateMetadata`, OpenGraph)
- **sitemap.ts** und **robots.ts**
- **404-Seite** über `not-found.tsx`
- Responsives **Dark/Light-Theme** über CSS-Variablen (kein UI-Framework)

## Struktur

```
blog/
├── app/
│   ├── layout.tsx            Root-Layout + Header/Footer
│   ├── page.tsx              Startseite (Beitragsliste)
│   ├── about/page.tsx        Über-Seite
│   ├── posts/[slug]/page.tsx Einzelner Beitrag
│   ├── tags/page.tsx         Themenübersicht
│   ├── tags/[tag]/page.tsx   Beiträge nach Tag
│   ├── not-found.tsx         404
│   ├── sitemap.ts            sitemap.xml
│   ├── robots.ts             robots.txt
│   ├── globals.css           Styling
│   └── components/           Header, Footer, PostCard
├── lib/posts.ts              Datenzugriff + Markdown-Pipeline
└── posts/*.md                Beiträge (Frontmatter + Markdown)
```

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Neuen Beitrag anlegen

Lege eine Datei `posts/<slug>.md` an:

```markdown
---
title: "Mein Titel"
date: "2026-06-15"
excerpt: "Kurzbeschreibung."
author: "Columbus"
tags: ["nextjs", "react"]
---

# Inhalt als Markdown
```
