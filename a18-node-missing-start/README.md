# a18-node-missing-start

Eigenständige node-Anwendung. Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON.

```sh
npm run build
node workbench.mjs
npm test
```

Standardport 8080, über PORT konfigurierbar. Lokaler Start bindet an 127.0.0.1; HOST kann explizit gesetzt werden. Keine Laufzeit-Abhängigkeit von einem Nachbarprojekt.


## Compiler-Fall und Varianten

Node-App ohne Startbefehl (kein `scripts.start`, kein `main`)

Erwartung auf der Lily-Plattform: Build scheitert mit klarer Meldung

[Prüfablauf und Gegenprobe](scenario.json). Lokale Builds sind keine Bestätigung des Wasm-/Lily-Pfads.

- [.](./): node · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON
