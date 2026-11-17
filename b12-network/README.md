# B12 · App mit Datenbank (dbd, Postgres, `DATABASE_URL`, `PG*`)

Erwartung auf der Lily-Plattform: verbindet per TLS, Daten bleiben über Redeploy

[Prüfablauf und Gegenprobe](scenario.json). Diese Apps sind synthetische Nachbauten. Lokale Builds und echte HTTP-Tests prüfen die App-Funktion; der Plattformfall und seine Gegenprobe gegen eine alte Version bleiben separat offen.

## Apps

- [prisma-postgres](prisma-postgres/): prisma · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON

- [pg](pg/): pg · Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON
