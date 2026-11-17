# sqlite

Eigenständige prisma-Anwendung. Katalog, Suche, Kunden, Aufträge, Reservierung, Versand, Retouren, Audit, CSV/JSON.

```sh
npm ci
npm run build
npm run db:push
npm start
npm test
```

Standardport 8080, über PORT konfigurierbar. Lokaler Start bindet an 127.0.0.1; HOST kann explizit gesetzt werden. Keine Laufzeit-Abhängigkeit von einem Nachbarprojekt.

Vor dem Start `npm run db:push` ausführen. PostgreSQL benötigt eine eigene DATABASE_URL; SQLite verwendet den relativen Pfad aus .env.
