# A6 · Kontor / Next.js app

Eigenständige Warenwirtschaft mit Katalog, Suche, Pagination, Kunden, mehrteiligen Aufträgen, Reservierung, Versand, Retouren, Änderungsjournal und CSV/JSON-Export. Fachliche Daten liegen im Prozessspeicher; `CATALOG_SIZE=10000` aktiviert den großen Katalog.

```sh
npm ci
npm run build
PORT=5105 npm start
npm test
```

`/`, `/orders/demo`, `/api/state`, `/api/commands`, `/api/export`. Header für Schreibzugriffe: `X-Sample: 1`. Versionen sind gepinnt. Keine Nachbarprojekt-Abhängigkeit. Der Compiler-/Plattformnachweis ist separat in scenario.json beschrieben und lokal nicht behauptet.


## Compiler-Fall und Varianten

Next.js mit `fs/promises`-Lesezugriff zur Laufzeit (JSON-Dateien)

Erwartung auf der Lily-Plattform: geht auf Node, liefert Daten (kein 500)

[Prüfablauf und Gegenprobe](scenario.json). Lokale Builds sind keine Bestätigung des Wasm-/Lily-Pfads.

- [.](./): next · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON
