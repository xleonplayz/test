# B7 · Name aus `lily.toml` (`name = "api"`) als Peer-Name `http://api:8080`

Erwartung auf der Lily-Plattform: löst auf oder ein klarer Hinweis steht im Build-Log

[Prüfablauf und Gegenprobe](scenario.json). Diese Apps sind synthetische Nachbauten. Lokale Builds und echte HTTP-Tests prüfen die App-Funktion; der Plattformfall und seine Gegenprobe gegen eine alte Version bleiben separat offen.

## Apps

- [api](api/): node · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [web](web/): node · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

Gemeinsam lokal starten, nachdem die Apps gebaut wurden: `python3 start-local.py --base-port 8080`. Strg+C beendet alle gestarteten Dienste. Die App-Daten bleiben im jeweiligen data-Verzeichnis. Die lokale Verbindung verwendet TCP/HTTP und bestätigt keine Lily-Kante.
