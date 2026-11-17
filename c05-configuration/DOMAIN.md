> Fachliche Dokumentation der übernommenen Stammanwendung. Die aktuellen Startbefehle und Ports dieses Compiler-Falls stehen in README.md und sample.json. Frühere Screenshot-/Prüfverweise beziehen sich auf die Stammanwendung; aktuelle Nachweise stehen zentral in ../VERIFICATION.md.

# Bühne

Veranstaltungsmanagement für Kulturhäuser, Workshops und kleine Veranstaltungsreihen. Programmplanung, Raumbelegung, Gäste, Warteliste, Check-in und Kosten bilden einen zusammenhängenden Ablauf.

## Einmal vollständig durchspielen

1. Unter **Räume** einen Raum mit Standort und Kapazität anlegen.
2. Eine **Veranstaltung** mit Zeitraum, Event-Kapazität, Ticketpreis und Budget erstellen.
3. Im Veranstaltungsdetail **Programmpunkte** mit Raum, Zeit und Referent oder Act ergänzen.
4. **Anmeldung öffnen**: Erst jetzt lassen sich Gäste anmelden.
5. Gäste erfassen. Ist die Kapazität voll, erhält die Anmeldung automatisch den Status **Warteliste**.
6. Eine bestätigte Anmeldung stornieren: Der zuerst wartende Gast rückt automatisch nach. Auch eine erhöhte Kapazität löst Nachrücken aus.
7. Gäste **einchecken**, bei Bedarf den Check-in zurücknehmen.
8. **Budget & Kosten**: Plankosten ergänzen und tatsächliche Kosten separat erfassen.
9. Die Veranstaltung **abschließen**. Danach sind Anmeldung und Check-in geschlossen; Istkosten können noch ergänzt werden.

## Fachliche Regeln

- Programmpunkte müssen innerhalb des Veranstaltungszeitraums liegen. Ein Raum kann nicht gleichzeitig durch mehrere Programmpunkte belegt sein, auch über Veranstaltungsgrenzen hinweg. Direkt aufeinanderfolgende Belegungen sind erlaubt.
- Entwürfe reservieren mit ihren Programmpunkten bereits Räume. Eine Absage gibt diese Belegung frei, erhält aber die Historie.
- Event-Kapazität und Raumkapazität sind getrennt: Eine Event-Anmeldung reserviert keinen einzelnen Workshop-Sitzplatz. Die Raumkapazität dient der Planung; individuelle Platzbuchungen pro Programmpunkt sind nicht enthalten.
- Pro Veranstaltung ist eine E-Mail-Adresse nur einmal aktiv angemeldet. Stornierte Personen können neu angemeldet werden.
- Kapazität darf nicht unter bestätigte Anmeldungen sinken. Nach der ersten aktiven Anmeldung bleibt der Ticketpreis fest.
- Eingecheckte Gäste müssen vor einer Einzelstornierung ausgecheckt werden.
- Die Anmeldung wird manuell über den Veranstaltungsstatus geöffnet und geschlossen; kein zeitgesteuerter Hintergrundjob schließt vergangene Veranstaltungen automatisch.
- Ticketwert bedeutet bestätigte Anmeldungen × Preis. Es werden keine Zahlungen, Erstattungen, Tickets oder E-Mails verschickt.
- Geld wird in ganzen Cent gespeichert. Istkosten können von den Plankosten abweichen; Budgetüberschreitungen werden sichtbar, aber nicht blockiert.

**Spielplan** zeigt die Programmpunkte chronologisch. Der iCalendar-Download enthält die veröffentlichten Gesamtveranstaltungen mit Ort und Beschreibung. Zeitpunkte werden in UTC gespeichert und in der Browser-Zeitzone angezeigt.

Die Übersicht enthält drei Veranstaltungen, drei Räume, ein mehrteiliges Abendprogramm, eine volle Workshop-Anmeldung mit Warteliste und Beispielkosten.

## Start und Daten

Node.js ≥ 22.13 wird benötigt. Die Anwendung verwendet ausschließlich eingebaute Node-Module und hat keine npm-Laufzeitabhängigkeiten.

~~~bash
cd /home/leon/dev/samples/node-buehne
npm start
# http://127.0.0.1:4501
~~~

npm run dev startet mit automatischem Serverneustart bei Quellcodeänderungen. Es gibt keinen Frontend-Buildschritt. Die Beispieldaten entstehen beim ersten Start; spätere Starts erhalten alle Änderungen.

Standardmäßig liegt die Datenbank unter data/buehne.sqlite. APP_DATA_DIR ändert den Datenordner, PORT den Port und HOST die Bind-Adresse. Standard ist 127.0.0.1.

~~~bash
APP_DATA_DIR=/pfad/zu/buehne PORT=4501 npm start
npm test
~~~

Alle Schreibvorgänge sind SQLite-Transaktionen. Jede Anfrage enthält die geladene Revision; veraltete Änderungen werden mit HTTP 409 abgewiesen. Dialogeingaben bleiben erhalten, während die Ansicht aktuelle Daten lädt. Die Aktion wird erst nach einem erneuten Speicherversuch angewendet.

## Eigenes Volume

~~~bash
docker compose up --build -d
docker compose down
~~~

Compose veröffentlicht ausschließlich 127.0.0.1:4501. Das benannte Volume buehne_data wird nach /app/data gemountet. Compose ergänzt den Projektnamen im tatsächlichen Volume-Namen. down erhält die Daten; down -v löscht sie.

Für einen sichtbaren Hostordner kann der Mount durch ./data:/app/data ersetzt werden. Dieser Ordner muss für UID 1000 beschreibbar sein.

**Container-Build und Containerstart sind nicht verifiziert:** Docker ist auf dem Erstellungsrechner nicht installiert. Der direkte Node-Start, die automatisierten Tests und die Browserabläufe wurden ausgeführt.

JSON exportiert den vollständigen Arbeitsbestand einschließlich Audit-Verlauf. CSV enthält die fachliche Auswertung. Die Exporte sind keine unterstützten Rückimportformate. Für eine wiederherstellbare Sicherung die App stoppen und den gesamten Datenordner kopieren.

## Aufbau und Prüfung

- store.mjs: eigenes Datenmodell, Geschäftsregeln, Beispieldaten und Exporte.
- db.mjs: SQLite-Zugriff, Transaktionen, Validierung und Revisionskontrolle.
- server.mjs: HTTP, lokale Dateien und JSON-Kommandos.
- web/: Oberfläche in JavaScript, HTML und CSS, ohne externe Ressourcen.
- tests/domain.test.mjs: fachliche Invarianten und Fehlerfälle.
- tests/persistence-http.test.mjs: Wiederöffnen der Datenbank, Konflikte und echte HTTP-Anfragen.
- tests/browser-check.cjs: reproduzierbarer Browserablauf.
- artifacts/: Screenshots und konkrete Prüfprotokolle.

npm test benötigt keine zusätzlichen Pakete. Die optionalen Browserchecks benötigen @playwright/test, @axe-core/playwright und Chromium in einem separaten Werkzeugordner:

~~~bash
BROWSER_TOOLS_DIR=/pfad/zu/browser-werkzeugen node tests/browser-check.cjs
~~~

BROWSER_TOOLS_DIR zeigt auf den Ordner, in dem die Testpakete installiert sind. CHROMIUM_EXECUTABLE kann eine vorhandene Chromium-Datei auswählen; sonst verwendet Playwright seinen installierten Browser. TEST_PORT überschreibt den Testport (standardmäßig Anwendungsport + 10000). Der Browsertest startet einen eigenen Server mit temporärer Datenbank und beendet ihn anschließend.

Die Prüfungen decken Desktop (1440 × 1000), Mobilansicht (390 × 844), die Hauptansichten, zentrale Dialoge und vollständige Arbeitsabläufe ab. Axe prüft automatisierbare WCAG-A/AA-Regeln; das ist kein vollständiges Barrierefreiheits-Audit.

## Betriebsrahmen

Eigenständiger lokaler Arbeitsbereich ohne Anmeldung oder Rollenprüfung. Ein Datenordner beziehungsweise Volume gehört genau dieser App. Kein gemeinsamer Laufzeitserver und keine Build- oder Laufzeitimporte aus Nachbarprojekten. Die Oberfläche lädt den gesamten Arbeitsbestand; Pagination und ein Mehrbenutzer-Berechtigungsmodell sind nicht implementiert.
