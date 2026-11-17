# a29-node-start-incomplete

Eigenständige node-Anwendung. Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON.

```sh
npm run build
npm start
npm test
```

Standardport 8080, über PORT konfigurierbar. Lokaler Start bindet an 127.0.0.1; HOST kann explizit gesetzt werden. Keine Laufzeit-Abhängigkeit von einem Nachbarprojekt.


## Compiler-Fall und Varianten

Node-App, die getrimmt eine Startvoraussetzung verliert

Erwartung auf der Lily-Plattform: Build scheitert mit „START INCOMPLETE“, nicht erst beim Start

[Prüfablauf und Gegenprobe](scenario.json). Lokale Builds sind keine Bestätigung des Wasm-/Lily-Pfads.

- [.](./): node · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON
