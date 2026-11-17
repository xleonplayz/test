# A1 · Kontor / Next.js app

Eigenständige Warenwirtschaft mit Katalog, Suche, Pagination, Kunden, mehrteiligen Aufträgen, Reservierung, Versand, Retouren, Änderungsjournal und CSV/JSON-Export. Fachliche Daten liegen im Prozessspeicher; `CATALOG_SIZE=10000` aktiviert den großen Katalog.

```sh
npm ci
npm run build
PORT=5100 npm start
npm test
```

`/`, `/orders/demo`, `/api/state`, `/api/commands`, `/api/export`. Header für Schreibzugriffe: `X-Sample: 1`. Versionen sind gepinnt. Keine Nachbarprojekt-Abhängigkeit. Der Compiler-/Plattformnachweis ist separat in scenario.json beschrieben und lokal nicht behauptet.
