---
title: "Fünf TypeScript-Tipps für den Alltag"
date: "2026-05-28"
excerpt: "Kleine Kniffe, die deinen TypeScript-Code sicherer und lesbarer machen."
author: "Columbus"
tags: ["typescript", "grundlagen"]
---

# Fünf TypeScript-Tipps für den Alltag

TypeScript ist mächtig — hier sind fünf Tipps, die im Alltag viel bringen.

## 1. `satisfies` statt Cast

```ts
const config = {
  port: 3000,
  host: "localhost",
} satisfies Record<string, string | number>;
```

So bleibt der konkrete Typ erhalten und wird trotzdem geprüft.

## 2. Discriminated Unions

```ts
type Result =
  | { ok: true; value: number }
  | { ok: false; error: string };
```

Der `ok`-Diskriminator macht das `switch` typsicher.

## 3. `as const` für Literale

```ts
const ROLES = ["admin", "user", "guest"] as const;
type Role = (typeof ROLES)[number];
```

## 4. Utility Types nutzen

`Partial`, `Pick`, `Omit`, `Record` — kennen und lieben lernen.

## 5. `unknown` statt `any`

`unknown` zwingt dich zu einer Prüfung, bevor du den Wert benutzt. Sicherer als
`any` in fast jedem Fall.

> Typen sind Dokumentation, die der Compiler überprüft.
