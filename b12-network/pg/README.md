# pg

Eigenständige pg-Anwendung. Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON.

```sh
npm ci
npm run build
npm start
npm test
```

Standardport 8080, über PORT konfigurierbar. Lokaler Start bindet an 127.0.0.1; HOST kann explizit gesetzt werden. Keine Laufzeit-Abhängigkeit von einem Nachbarprojekt.

Benötigt PostgreSQL mit TLS: DATABASE_URL oder PGHOST/PGPORT/PGDATABASE/PGUSER konfigurieren und eine vertrauenswürdige CA über PGSSLROOTCERT angeben. `/api/database` meldet den tatsächlich verwendeten TLS-Status der Sitzung. `python3 ../../../scripts/corpus/postgres-check.py` vom App-Verzeichnis startet für die zentrale Prüfung einen isolierten lokalen TLS-Testcluster.
