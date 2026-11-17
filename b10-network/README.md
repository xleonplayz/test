# B10 · Monorepo mit 4 bis 6 Apps gemischter Sprachen

Erwartung auf der Lily-Plattform: alle live, alle Kanten getragen oder gemeldet

[Prüfablauf und Gegenprobe](scenario.json). Diese Apps sind synthetische Nachbauten. Lokale Builds und echte HTTP-Tests prüfen die App-Funktion; der Plattformfall und seine Gegenprobe gegen eine alte Version bleiben separat offen.

## Apps

- [planning](planning/): cpp · Produktionsplanung, Wartung, drei Heuristiken, Kapazitätsvergleich, Gantt, SVG/CSV/JSON und CLI

- [orders](orders/): node · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [portal](portal/): next · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [support](support/): rust · Support-Desk mit Kunden, Tickets, Antworten, Zuständigkeiten, Fristen und Audit

- [warehouse](warehouse/): node · Vollständige Fachanwendung; Details in DOMAIN.md bzw. der bisherigen README

- [academy](academy/): node · Vollständige Fachanwendung; Details in DOMAIN.md bzw. der bisherigen README

Gemeinsam lokal starten, nachdem die Apps gebaut wurden: `python3 start-local.py --base-port 8080`. Strg+C beendet alle gestarteten Dienste. Die App-Daten bleiben im jeweiligen data-Verzeichnis. Die lokale Verbindung verwendet TCP/HTTP und bestätigt keine Lily-Kante.
