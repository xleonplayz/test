# Depot

Eigenständige Lager- und Einkaufsanwendung für eine kleine Werkstatt. Node.js bedient die Oberfläche und speichert sämtliche Geschäftsdaten in einer lokalen SQLite-Datenbank. Keine Laufzeitpakete, kein gemeinsamer Server mit anderen Samples.

## Starten

Node.js ≥ 22.13 erforderlich.

~~~bash
cd /home/leon/dev/samples/node-depot
npm start
# http://127.0.0.1:4401
~~~

Beim ersten Start entstehen zwei Lieferanten, vier Artikel, eine Bestellung und eine Reservierung. Die Daten liegen unter data/depot.sqlite. APP_DATA_DIR ändert den Datenordner, PORT den Port und HOST die Bind-Adresse; Standard ist 127.0.0.1.

~~~bash
APP_DATA_DIR=/pfad/zu/depot PORT=4401 npm start
npm test
~~~

## Ein vollständiger Ablauf

1. Unter **Lieferanten** einen Lieferanten erfassen.
2. Unter **Artikel & Bestand** einen Artikel mit eindeutiger SKU, Lagerplatz, Mindestbestand, Einstandspreis und Anfangsbestand anlegen.
3. Unter **Einkauf** eine Bestellung mit mehreren Artikeln desselben Lieferanten erstellen.
4. Einen **Wareneingang** in Teilmengen buchen. Noch nicht gelieferte Mengen bleiben offen; die offene Restmenge kann storniert werden.
5. Unter **Auslieferung** mehrere Artikel für einen Auftrag reservieren. Verfügbar ist Bestand minus offene Reservierungen.
6. Den Auftrag ausliefern oder die Reservierung freigeben. Das **Bewegungsjournal** zeigt jede Bestandsänderung.

Die Übersicht hebt Nachbestellungen hervor und öffnet passende Bestellformulare. Bestandssuche, Mindestbestandsfilter, Stammdatenänderung und begründete Inventurkorrekturen sind enthalten. Bestellungen sind lokale Vorgänge und werden nicht an Lieferanten übertragen.

## Datenregeln

- Jede Änderung läuft in einer SQLite-Transaktion. Scheitert eine Position, wird der gesamte Vorgang zurückgerollt.
- Ein Revisionszähler schützt vor veralteten Änderungen aus anderen Tabs. Bei einem Konflikt werden aktuelle Daten geladen; die Eingabe bleibt zur Überprüfung offen.
- Reservierte Ware kann nicht wegkorrigiert oder erneut reserviert werden. Auslieferungen lassen sich nicht doppelt buchen.
- Bestellpositionen bewahren den damaligen Einstandspreis. Der angezeigte Bestandswert verwendet den aktuellen Artikelpreis; er ist keine Buchhaltungsbewertung.
- Mengen sind ganze Einheiten, Preise werden als ganze Cent gespeichert. Ein Standort, eine Währung (EUR), maximal 30 Positionen pro Vorgang.
- Das Journal ist über die Anwendung nur ergänzbar. Es ist kein manipulationssicheres externes Audit-System.

## Daten und Volume

~~~bash
docker compose up --build -d
docker compose down
~~~

Compose bindet Port 4401 nur lokal und verwendet ein eigenes Volume depot_data unter /app/data. Der tatsächliche Volume-Name erhält den Compose-Projektnamen als Präfix. down erhält die Daten; down -v löscht das Volume. Für einen sichtbaren Hostordner kann der Mount durch ./data:/app/data ersetzt werden; dieser Ordner muss für UID 1000 beschreibbar sein.

**Container-Build und Containerstart sind nicht geprüft:** Auf dem Erstellungsrechner ist Docker nicht installiert. Der direkte Node-Start und die Tests wurden ausgeführt.

Der JSON-Export enthält vollständige Bewegungen und Aktionen; die UI zeigt davon die letzten 500 beziehungsweise 100. CSV exportiert den aktuellen Bestand und entschärft Formeleinträge. JSON ist ein Datenexport, kein unterstütztes Rückimportformat. Für eine wiederherstellbare Sicherung die App stoppen und den ganzen Datenordner sichern.

## Aufbau und Grenzen

- store.mjs: Schema, Validierung, Transaktionen und Exporte.
- server.mjs: HTTP, statische Dateien und JSON-Kommandos.
- web/: Oberfläche ohne Buildschritt oder externe Ressourcen.
- tests/store.test.mjs: Geschäftsregeln, Persistenz und HTTP.
- artifacts/: Desktop- und Mobilansicht sowie Prüfprotokoll.

Lokaler Arbeitsbereich ohne Anmeldung, Rollenverwaltung oder externe Integrationen. Keine parallele Bearbeitung einzelner Lagerstandorte, Chargen, Retouren oder Steuerberechnung. Ein Docker-Volume oder Datenordner gehört genau dieser App.
