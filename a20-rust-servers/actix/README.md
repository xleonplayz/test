# Funkraum

Eigenständiger Support-Desk mit Rust-Webserver, eingebetteter Oberfläche und eigener SQLite-Datenbank. Kunden, Team, Tickets, Antwortfristen, Gesprächsverläufe und Textbausteine bilden einen zusammenhängenden Arbeitsablauf.

## Starten

Rust ≥ 1.88 und ein C-Compiler werden benötigt. SQLite wird mitgebaut.

~~~bash
cd /home/leon/dev/samples/rust-funkraum
cargo run --locked
# http://127.0.0.1:4402
~~~

~~~bash
cargo build --release --locked
./target/release/funkraum --port 4402 --db data/funkraum.sqlite
cargo test --locked
~~~

Standard: 127.0.0.1:4402, Datenbank data/funkraum.sqlite. Die Oberfläche ist im Binary eingebettet; nach einem Build braucht der Server keinen web/-Ordner. Der erste Start legt Beispieldaten an.

## Arbeitsablauf und Funktionen

1. Einen **Kunden** mit Standard- oder Priority-Service anlegen.
2. Ein **Ticket** für Allgemein, Technik oder Abrechnung erfassen, priorisieren und einer Person im passenden Bereich zuweisen.
3. Im Gesprächsverlauf interne **Notizen** und **Antworten** getrennt protokollieren. Textbausteine sind anpassbare Vorlagen.
4. Das Anliegen bearbeiten, auf wartend setzen oder mit einer Zusammenfassung lösen.
5. Bei einer Rückfrage wieder öffnen: Ein neuer Antwortzyklus beginnt, der alte Verlauf bleibt erhalten.

Die Ticketliste bietet Volltextsuche über Ticket- und Kundendaten, Status-/Bereichs-/Prioritätsfilter, Ansichten für überfällige oder unzugewiesene Anliegen und Sammelzuweisung. Eigene Filteransichten werden nur in diesem Browser gespeichert. Die Übersichtsseite zeigt offene Anliegen, Antwortfristen und die Verteilung auf die Bereiche. Kunden- und Teamseiten führen direkt zu ihren Tickets.

**Antworten werden nur lokal protokolliert. Es wird keine E-Mail versendet oder empfangen.**

## Fristen und Zustände

P1: 4 Stunden, P2: 12 Stunden, P3: 24 Stunden. Priority-Kunden erhalten die halbe Frist. Es gelten durchgehende Echtzeitstunden ohne Geschäftszeiten oder Feiertagskalender.

Eine interne Notiz beendet keine Antwortfrist. Die erste protokollierte Antwort erfüllt die Frist dieses Zyklus. Eine Prioritätsänderung kann eine laufende Frist verkürzen, niemals verlängern. Beim Wiederöffnen beginnt die Frist mit der aktuellen Priorität neu.

Erlaubte Übergänge:

- Offen → In Bearbeitung, Wartet oder Gelöst.
- In Bearbeitung → Wartet oder Gelöst.
- Wartet → In Bearbeitung oder Gelöst.
- Gelöst → Offen.

Jeder Übergang braucht eine Zusammenfassung. Gelöste Tickets müssen vor weiteren Nachrichten oder Änderungen wieder geöffnet werden. Fristanzeigen aktualisieren sich beim Laden, Speichern oder über **Aktualisieren**; es gibt kein Live-Polling.

## Konsistenz und Export

Kommandos verwenden SQLite-Transaktionen und einen Revisionszähler. Veraltete Änderungen werden mit HTTP 409 abgelehnt. Nachrichtentext und Eintragstyp bleiben bei einem Konflikt im offenen Tab erhalten; erst nach erfolgreichem Speichern wird der Entwurf geleert. Eine Sammelzuweisung ist vollständig atomar: Passt nur eines der Tickets nicht zum Bereich oder ist bereits gelöst, wird kein Ticket zugewiesen.

Der JSON-Export enthält Kunden, Personen, Tickets, Nachrichten, Vorlagen und Ereignisse. Ein Rückimport ist nicht implementiert. Für eine wiederherstellbare Sicherung den Server stoppen und den gesamten Datenordner kopieren.

## Eigenes Volume

~~~bash
docker compose up --build -d
docker compose down
~~~

Compose veröffentlicht 127.0.0.1:4402 und legt ein eigenes Volume funkraum_data unter /app/data an. Compose ergänzt seinen Projektnamen im tatsächlichen Volume-Namen. down erhält das Volume; down -v löscht es. Für einen Hostordner stattdessen ./data:/app/data verwenden und UID 10001 Schreibrechte geben.

**Container-Build und Containerstart sind nicht geprüft:** Docker ist auf dem Erstellungsrechner nicht installiert. Rust-Build, Tests und direkter Serverstart wurden ausgeführt.

## Aufbau und Grenzen

- src/lib.rs: Datenmodell, Regeln, Transaktionen und Regeltests.
- src/main.rs: Axum-HTTP-Server.
- web/: eingebettete Oberfläche, keine externen Laufzeitressourcen.
- tests/http.rs: echte Serveranfragen, Herkunftsprüfung, Konflikte und Export.
- artifacts/: Desktop-/Mobilansicht und Prüfprotokoll.

Lokaler Arbeitsbereich ohne Anmeldung. Personen sind organisatorische Zuständigkeiten, keine Benutzerkonten. Keine Berechtigungsprüfung, Mailanbindung, Anhänge, Eskalationsnachrichten oder verteilten Hintergrundjobs. Die aktuelle Oberfläche lädt den gesamten Arbeitsbestand; große Support-Organisationen brauchen zusätzliche Pagination und Indizierungsarbeit.
