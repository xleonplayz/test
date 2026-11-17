# B1 · Frontend Wasm → Backend Wasm über Kante

Erwartung auf der Lily-Plattform: `/api` 200

[Prüfablauf und Gegenprobe](scenario.json). Diese Apps sind synthetische Nachbauten. Lokale Builds und echte HTTP-Tests prüfen die App-Funktion; der Plattformfall und seine Gegenprobe gegen eine alte Version bleiben separat offen.

## Apps

- [api](api/): next · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [web](web/): next · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

Gemeinsam lokal starten, nachdem die Apps gebaut wurden: `python3 start-local.py --base-port 8080`. Strg+C beendet alle gestarteten Dienste. Die App-Daten bleiben im jeweiligen data-Verzeichnis. Die lokale Verbindung verwendet TCP/HTTP und bestätigt keine Lily-Kante.
