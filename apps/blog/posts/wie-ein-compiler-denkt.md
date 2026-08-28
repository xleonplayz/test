---
title: "Wie ein Compiler denkt"
date: "2026-06-08"
excerpt: "Von der Quelldatei zum ausführbaren Programm — die Phasen eines Compilers."
author: "Columbus"
tags: ["compiler", "grundlagen"]
---

# Wie ein Compiler denkt

Ein Compiler übersetzt Quelltext in eine andere Form — oft Maschinencode oder
ein Zwischenformat. Dabei durchläuft er mehrere klar abgegrenzte Phasen.

## Die klassischen Phasen

1. **Lexing** — der Text wird in Tokens zerlegt.
2. **Parsing** — aus Tokens entsteht ein Syntaxbaum (AST).
3. **Semantische Analyse** — Typen werden geprüft, Namen aufgelöst.
4. **Zwischencode** — ein IR (Intermediate Representation) entsteht.
5. **Optimierung** — der IR wird umgeformt, ohne die Bedeutung zu ändern.
6. **Codegenerierung** — am Ende steht das Zielformat.

```text
Quelle → [Lexer] → Tokens → [Parser] → AST → [Sema] → IR → [Codegen] → Ziel
```

## Warum Zwischencode?

Ein IR entkoppelt Frontend (Sprache) von Backend (Zielplattform). So kann ein
Compiler mehrere Sprachen auf mehrere Plattformen abbilden, ohne dass jede
Kombination einzeln implementiert werden muss.

> Ein gutes IR ist einfach genug zum Optimieren und ausdrucksstark genug, um
> nichts Wichtiges zu verlieren.

Genau dieses Prinzip steckt auch hinter modernen Web-Compilern.
