# A14 · Bun mit nicht abgedeckter API (`bun:sqlite`, `Bun.spawn`, `$` aus `bun`, WebSocket)

Erwartung auf der Lily-Plattform: Build scheitert mit klarer Meldung, die die API nennt

[Prüfablauf und Gegenprobe](scenario.json). Diese Apps sind synthetische Nachbauten. Lokale Builds und echte HTTP-Tests prüfen die App-Funktion; der Plattformfall und seine Gegenprobe gegen eine alte Version bleiben separat offen.

## Apps

- [websocket](websocket/): bun · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [shell](shell/): bun · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [spawn](spawn/): bun · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [sqlite](sqlite/): bun · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON
