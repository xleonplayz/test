# A9 · Kontor / Next.js app

Eigenständige Warenwirtschaft mit Katalog, Suche, Pagination, Kunden, mehrteiligen Aufträgen, Reservierung, Versand, Retouren, Änderungsjournal und CSV/JSON-Export. Fachliche Daten liegen im Prozessspeicher; `CATALOG_SIZE=10000` aktiviert den großen Katalog.

```sh
npm ci
npm run build
PORT=5108 npm start
npm test
```

`/`, `/orders/demo`, `/api/state`, `/api/commands`, `/api/export`. Header für Schreibzugriffe: `X-Sample: 1`. Versionen sind gepinnt. Keine Nachbarprojekt-Abhängigkeit. Der Compiler-/Plattformnachweis ist separat in scenario.json beschrieben und lokal nicht behauptet.

## Große Compiler-Eingabe

2.048 importierte Katalogmodule, 40.960 vollständige Artikel, 64 vorgerenderte Detailseiten und dynamische Detailseiten für den restlichen Katalog. Kein toter Padding-Code: Der API-Katalog und die Detailseiten verwenden die importierten Datensätze. Start über `npm start`; Detailbeispiel `/catalog/p1`.
