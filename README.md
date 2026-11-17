# Compiler- und Plattform-Samples · 17.11.2026

**103 Use-Case-Projekte mit 142 eigenständig startbaren App-Varianten**, zusätzlich zu den 24 bisherigen Anwendungen im übergeordneten Samples-Ordner. Grundlage ist die unverändert kopierte [Use-Case-Liste](SOURCE-USE-CASES.md) aus `/home/leon/prod/raptorplan/TESTFAELLE-USE-CASES-2026-11-17.md`.

Die [Abdeckungsmatrix](MATRIX.md) ordnet jeden Fall seinen Apps zu. [manifest.json](manifest.json) enthält alle 103 Fälle und ihre Varianten; [apps.json](apps.json) listet die konkreten Build-, Start- und Testbefehle der 142 Apps. Jeder Fall hat einen eigenen README-Einstieg und ein `scenario.json` mit Erwartung, Ablauf und Gegenprobe.

## Was tatsächlich enthalten ist

- Next.js App Router und Pages Router, Proxy/Login, statischer PNG-Import mit `next/image`, asynchrones `try/catch/finally`, Laufzeit-Dateizugriff, öffentliche Build-Variablen, Hash-Navigation und Turbopack.
- Nuxt 3 und 4 mit Nitro und einem tatsächlich verwendeten, extern gebündelten ESM-only-Paket.
- Vite- und Astro-Apps mit vollständiger Warenwirtschaft im Browser und persistenter lokaler Speicherung.
- Bun mit HTML-Import, Tailwind-Plugin, tiefen Pfaden, Methoden-Routen, Parametern, Wildcards und getrennten Varianten für SQLite, Spawn, Shell und WebSocket. Zwei Lockfile-Varianten verwenden denselben Anwendungskern.
- TypeScript/tsx, Express, Koa, Hono, Fastify und Node HTTP.
- Rust mit axum und actix: kleine speicherbasierte Aufgaben-Apps, vollständiger SQLite-Support-Desk und eine Variante mit echten Betriebssystem-Abhängigkeiten.
- C++-Produktionsplanung als CLI und HTTP-App: vollständig statisch mit libpq, statisch mit DNS-Auflösung, gebündelte Shared Library und `backend/`-Layout.
- C ohne Build-System und mit Makefile. Vollständige Python-, Go- und Java-Apps als Eingaben für die erwartete Ablehnung durch Lily.
- Prisma 6 mit SQLite und PostgreSQL, PostgreSQL über `pg` mit geprüfter TLS-Verbindung, Headless-Chromium-PDF-Erzeugung, große Pakete und dynamisch geladene Startvoraussetzungen.
- Mehrere Apps pro Projekt, unterschiedliche gewünschte Laufzeiten, private Backends, gleiche Peer-Namen in getrennten Projekten und ein Projekt aus sechs Diensten in Next.js, Node.js, Rust und C++.

Die Fachanwendungen umfassen Warenwirtschaft, Lager/Einkauf, Veranstaltungsplanung, Weiterbildung, Reparaturbetrieb, Support, Produktionsplanung und Aufgabenverwaltung. Die Betriebsfälle verwenden bewusst eigenständige Kopien dieser vollständigen Anwendungen mit unterschiedlichen Konfigurationen und beobachtbaren Fehlerzuständen. Sie sind keine 103 verschiedenen Geschäftsideen; jede Fall-App besitzt aber ihren vollständigen eigenen Quellcode, ihre Oberfläche und ihren Fachablauf. Keine App lädt Code aus einem Nachbarprojekt.

## Kleine, mittlere und große Eingaben

| Beispiel | Umfang |
| --- | --- |
| [C-Aufgaben-App](a25-c-build-layouts/plain/) | Einzelner C-Server, eingebettete Oberfläche, Anlegen/Ändern/Löschen |
| [Rust-Support](a20-rust-servers/axum/) | Kunden, Tickets, Fristen, Zuständigkeiten, Antworten, Audit, SQLite |
| [Betriebsfälle](d07-lifecycle/) | Vollständige Fachanwendungen mit mehreren Ansichten und Tabellen |
| [Großer Next-Katalog](a09-next-turbopack/large-catalog/) | 2.048 importierte Module, 40.960 Artikel, 64 vorgerenderte und weitere dynamische Detailseiten |
| [Commerce mit sechs Diensten](b10-network/) | Portal, Bestellungen, Lager, Weiterbildung, Support, Produktionsplanung; 32.768 Artikel aus 128 importierten Modulen |
| [Großes Node-Paket](a28-node-large-package/) | 1.024.000 synthetische Archivdatensätze, 724.193.658 Archivbytes, zusätzlich 20.000 aktive Artikel |

Die großen Katalogmodule werden tatsächlich importiert und von API und Oberfläche verwendet. A28 trennt benötigte Laufzeitdaten von trimmbaren Archiven. `node make-catalog.mjs` erzeugt diese Daten im A28-Ordner reproduzierbar neu.

## Starten

Im jeweiligen App-Ordner stehen die genauen Befehle in `README.md` und `sample.json`. Typische Beispiele:

```sh
cd a01-next-app-router
npm ci
npm run build
PORT=8080 npm start
```

```sh
cd d07-lifecycle
npm start
```

Mehrere Dienste zusammen starten:

```sh
cd b10-network
# Zuerst die sechs Apps entsprechend ihren sample.json-Dateien bauen.
python3 start-local.py --base-port 8080
```

`topology.json` und `app.json` beschreiben die gewünschte Testtopologie; sie sind keine behauptete automatische Lily-Deployment-Konfiguration.

Der Launcher zeigt die URLs und beendet seine Dienste mit Strg+C. Daten bleiben im eigenen App-Verzeichnis. Die anderen Netzwerkprojekte besitzen denselben lokalen Launcher. Er verwendet gewöhnliches lokales TCP/HTTP; das bestätigt noch keine Lily-Kante.

`PORT` und `HOST` konfigurieren den Listener. Hinter einem Reverse Proxy berücksichtigen die Web-APIs den öffentlichen Host und `X-Forwarded-Proto: https`. Die kopierten Node-Fachanwendungen erlauben optional `ALLOWED_HOSTS` und `PUBLIC_ORIGIN`. Für persistente Varianten ist `APP_DATA_DIR` der Datenordner. Testläufe verwenden isolierte temporäre Daten.

Für PostgreSQL werden `DATABASE_URL` beziehungsweise `PG*` und beim `pg`-Client eine vertrauenswürdige CA über `PGSSLROOTCERT` benötigt. Prisma benötigt vor dem ersten Start `npm run db:push`. Die SQLite-Variante hat eine relative Dateiadresse in ihrer `.env`. Die eingecheckten Werte sind ausschließlich synthetische lokale Beispiele.

## Was verifiziert wird – und was offen bleibt

Der lokale Nachweis umfasst Builds mit den normalen Framework-/Sprachtoolchains, Fachtests, tatsächlich gestartete HTTP-Server, Schreibzugriffe, Konflikte, Neustarts, TLS, Browserabläufe und Spezialfälle. Die konkreten Ergebnisse und Logpfade stehen in [VERIFICATION.md](VERIFICATION.md) und [verification.json](verification.json).

**Lily-/Wasm-Kompilierung, reale Raptor-/Cap-Platzierung, Plattformabrechnung, öffentliche Edge-Routen, UI/CLI-Betriebsabläufe und Gegenproben gegen frühere fehlerhafte Plattformversionen wurden nicht ausgeführt.** `requested_runtime: wasm` bezeichnet die gewünschte Prüfspur, keinen bereits erbrachten Wasm-Nachweis. Alle Plattformfälle bleiben in `scenario.json` ausdrücklich `not_run`.

A14, A18 und A30 sollen auf der betreffenden Lily-Spur sichtbar abgewiesen werden. Ihre native Anwendung funktioniert dennoch und wurde lokal geprüft. A29 enthält eine funktionierende dynamische Startvoraussetzung und eine nachgewiesene negative Variante, bei der diese Datei fehlt. Ein fehlgeschlagener Start allein zählt nicht als bestandene Compiler-Diagnose.

## Reproduzierbare Prüfung

Vom Samples-Hauptordner:

```sh
# Die ursprünglichen 24 Apps:
python3 scripts/check-samples.py --jobs 2

# Alle 142 neuen Varianten bauen und testen:
python3 scripts/corpus/check.py --jobs 3

# Echte HTTP-Server; PostgreSQL separat mit isoliertem TLS-Cluster:
python3 scripts/corpus/smoke.py --skip-postgres --jobs 4
python3 scripts/corpus/postgres-check.py

# Ausgewählte vollständige Browserabläufe, Desktop/Mobil und lokale Spezialfälle:
python3 scripts/corpus/browser-check.py
python3 scripts/corpus/behavior-check.py
python3 scripts/corpus/special-check.py
python3 scripts/corpus/protocol-check.py
python3 scripts/corpus/launcher-check.py
```

Die Prüfskripte benötigen die jeweiligen lokalen Toolchains. Browserprüfungen verwenden Playwright aus `samples/studio`; Chromium kann über `CHROME_PATH` angegeben werden. Der PostgreSQL-Lauf verwendet die installierten PostgreSQL-16-Werkzeuge und OpenSSL, startet einen eigenen temporären Cluster und beendet ihn anschließend. Docker-/Compose-Läufe sind nicht Bestandteil des Nachweises.

Für eine echte Plattform-Transition kann der externe Beobachter parallel zu Deployment oder Restart laufen:

```sh
python3 scripts/corpus/observe.py \
  --url https://APP/__fixture \
  --seconds 60 --interval 0.2 \
  --allowed-status 200 --expect-release v2 \
  --output artifacts/platform-d5.json
```

Der Beobachter speichert reale HTTP-Antworten, Status, Version, Instanz und Latenz. Er führt keine Plattformänderung durch. Für D6 kann zusätzlich `--allowed-status 503` gesetzt werden; 404 bleibt damit ein Fehler. Jeder Plattformlauf benötigt außerdem die in `scenario.json` beschriebene Gegenprobe.
