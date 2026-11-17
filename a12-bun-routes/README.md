# a12-bun-routes

Eigenständige bun-Anwendung. Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON.

```sh
npm ci
npm run build
npm start
npm test
```

Standardport 8080, über PORT konfigurierbar. Lokaler Start bindet an 127.0.0.1; HOST kann explizit gesetzt werden. Keine Laufzeit-Abhängigkeit von einem Nachbarprojekt.


## Compiler-Fall und Varianten

Bun-Server mit `Bun.serve` (`fetch`, `routes`, `:params`, Wildcards, HTML-Import, Tailwind über `bun-plugin-tailwind`)

Erwartung auf der Lily-Plattform: läuft auf Node, `/`, Unterpfad, API GET/PUT/Param 200, CSS und JS laden

[Prüfablauf und Gegenprobe](scenario.json). Lokale Builds sind keine Bestätigung des Wasm-/Lily-Pfads.

- [.](./): bun · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON
