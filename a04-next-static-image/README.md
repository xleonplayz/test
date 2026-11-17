# A4 · Kontor / Next.js app

Eigenständige Warenwirtschaft mit Katalog, Suche, Pagination, Kunden, mehrteiligen Aufträgen, Reservierung, Versand, Retouren, Änderungsjournal und CSV/JSON-Export. Fachliche Daten liegen im Prozessspeicher; `CATALOG_SIZE=10000` aktiviert den großen Katalog.

```sh
npm ci
npm run build
PORT=5103 npm start
npm test
```

`/`, `/orders/demo`, `/api/state`, `/api/commands`, `/api/export`. Header für Schreibzugriffe: `X-Sample: 1`. Versionen sind gepinnt. Keine Nachbarprojekt-Abhängigkeit. Der Compiler-/Plattformnachweis ist separat in scenario.json beschrieben und lokal nicht behauptet.


## Compiler-Fall und Varianten

Next.js mit statischem Bild-Import aus `public/` (`import x from "@/public/a.png"`, auch `next/image` mit statischem Import)

Erwartung auf der Lily-Plattform: Wasm-Build ok, Seite rendert

[Prüfablauf und Gegenprobe](scenario.json). Lokale Builds sind keine Bestätigung des Wasm-/Lily-Pfads.

- [.](./): next · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON
