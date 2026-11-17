# a13-bun-deep-assets

Eigenständige bun-Anwendung. Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON.

```sh
npm ci
npm run build
npm start
npm test
```

Standardport 8080, über PORT konfigurierbar. Lokaler Start bindet an 127.0.0.1; HOST kann explizit gesetzt werden. Keine Laufzeit-Abhängigkeit von einem Nachbarprojekt.


## Compiler-Fall und Varianten

Bun-Server: Assets auf Unterpfaden (`/a/b/c` lädt `chunk-*.css`)

Erwartung auf der Lily-Plattform: Assets 200 (absolute URLs)

[Prüfablauf und Gegenprobe](scenario.json). Lokale Builds sind keine Bestätigung des Wasm-/Lily-Pfads.

- [.](./): bun · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON
