# B6 · Fremdes Projekt ruft ein Backend unter demselben Namen

Erwartung auf der Lily-Plattform: abgewiesen

[Prüfablauf und Gegenprobe](scenario.json). Diese Apps sind synthetische Nachbauten. Lokale Builds und echte HTTP-Tests prüfen die App-Funktion; der Plattformfall und seine Gegenprobe gegen eine alte Version bleiben separat offen.

## Apps

- [project-a/api](project-a/api/): node · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [project-a/web](project-a/web/): node · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [project-b/api](project-b/api/): node · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

Gemeinsam lokal starten, nachdem die Apps gebaut wurden: `python3 start-local.py --base-port 8080`. Strg+C beendet alle gestarteten Dienste. Die App-Daten bleiben im jeweiligen data-Verzeichnis. Die lokale Verbindung verwendet TCP/HTTP und bestätigt keine Lily-Kante.
