---
title: "Server Components verstehen"
date: "2026-06-12"
excerpt: "Was React Server Components wirklich ändern — und wann du sie brauchst."
author: "Columbus"
tags: ["react", "nextjs", "performance"]
---

# Server Components verstehen

React Server Components (RSC) sind eine der größten Änderungen im React-Ökosystem
seit Hooks. Aber was bedeuten sie konkret?

## Das Kernkonzept

Eine Server Component wird **nur auf dem Server** ausgeführt. Ihr Code landet nie
im Browser-Bundle. Das hat zwei direkte Folgen:

1. Das JavaScript-Bundle wird kleiner.
2. Du kannst direkt auf Server-Ressourcen zugreifen (Dateisystem, Datenbank).

```tsx
// app/page.tsx — eine Server Component
import { db } from "@/lib/db";

export default async function Page() {
  const posts = await db.posts.findMany();
  return <PostList posts={posts} />;
}
```

## Wann brauchst du Client Components?

Sobald du Interaktivität brauchst — `useState`, `useEffect`, Event-Handler —
markierst du eine Komponente mit `"use client"`.

| Aufgabe | Komponententyp |
| --- | --- |
| Daten laden | Server |
| Formular mit lokalem State | Client |
| Statisches Markup | Server |

## Fazit

Die Faustregel: **Server als Standard, Client nur wo nötig.** So bleibt das
Bundle schlank und die Seite schnell.
