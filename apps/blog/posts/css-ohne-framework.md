---
title: "CSS ohne Framework"
date: "2026-06-03"
excerpt: "Moderne CSS-Features machen viele Utility-Frameworks überflüssig."
author: "Columbus"
tags: ["css", "frontend", "performance"]
---

# CSS ohne Framework

Man braucht nicht immer ein Framework. Modernes CSS bringt vieles von Haus aus
mit — und das ohne ein Byte JavaScript.

## Custom Properties

CSS-Variablen sind perfekt für Theming:

```css
:root {
  --accent: #4c8dff;
}
a {
  color: var(--accent);
}
```

## Layout mit Grid und Flexbox

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
```

## Dark Mode in drei Zeilen

```css
@media (prefers-color-scheme: dark) {
  :root { --bg: #0f1115; }
}
```

## Fazit

Für viele Projekte reicht **handgeschriebenes CSS** völlig aus — gut strukturiert,
mit Variablen und modernen Layout-Primitiven. Weniger Abhängigkeiten, kleineres
Bundle, volle Kontrolle.
